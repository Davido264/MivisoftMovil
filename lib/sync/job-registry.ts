import { RemoteJobReg } from "@/lib/odoo/job-registry";
import db, { transBehavior } from "@/lib/db";
import assert from "@/lib/assert";
import { parseOdoo } from "@/lib/date";
import { getLocalJobRegistryFromOdooId } from "@/lib/db/queries/job-registry";
import {
  insertJobRegistry,
  purgeDeletedJobRegistries,
  updateJobRegistry,
} from "@/lib/db/actions/job-registry";
import { transformError } from "@/lib/result";
import { Logger } from "@/lib/logger";
import { createBreather } from "@/lib/async";
import { hasLocalChanges } from "@/lib/db/actions/utils";

const logger = Logger.getLogger("job-registry");

export async function reconciliateJobRegistries(
  remoteEntities: RemoteJobReg[],
) {
  const pop = Logger.startSubStackTrace("job-registry::reconciliate");
  try {
    logger.verbose("reconciliateJobRegistries called", {
      count: remoteEntities.length,
      sample: remoteEntities.slice(0, 3),
    });

    await db.transaction(
      async (tx) => {
        const breathe = createBreather();
        for (const remote of remoteEntities) {
          await breathe();
          assert.notNull(remote.id, "remote.id");
          const local = await getLocalJobRegistryFromOdooId(remote.id, tx);

          if (local === undefined) {
            await insertJobRegistry(
              {
                odooId: remote.id,
                itineraryId: remote.itinerary_id,
                userId: remote.user_id,
                observation: remote.observation,
                companyId: remote.company_id,
                startDate: parseOdoo(remote.start_datetime),
                vehicleId: remote.fleet_vehicle_id,
                endDate: remote.end_datetime
                  ? parseOdoo(remote.end_datetime)
                  : undefined,
                score: remote.score,
              },
              true,
              tx,
            );
            continue;
          }

          // Cambios locales sin subir ganan: no pisar con la versión remota.
          if (hasLocalChanges(local)) continue;

          // local.lastsync ??= new Date(0);
          // if (
          //   local.lastmod <= local.lastsync &&
          //   remote.lastmod <= local.lastsync
          // ) {
          //   continue; // all synced
          // }

          // if (local.lastmod > local.lastsync) {
          //   // TODO: For now, local wins always
          //   continue;
          // }

          // if (
          //   local.lastmod > local.lastsync &&
          //   remote.lastmod > local.lastsync
          // ) {
          //   // TODO: Conflict resolution
          //   continue;
          // }

          await updateJobRegistry(
            local.id,
            {
              odooId: remote.id,
              itineraryId: remote.itinerary_id,
              userId: remote.user_id,
              observation: remote.observation,
              companyId: remote.company_id,
              startDate: parseOdoo(remote.start_datetime),
              vehicleId: remote.fleet_vehicle_id,
              endDate: remote.end_datetime
                ? parseOdoo(remote.end_datetime)
                : undefined,
              score: remote.score,
            },
            true,
            false,
            tx,
          );
        }

        await purgeDeletedJobRegistries(
          remoteEntities.map((i) => i.id),
          tx,
        );
      },
      { behavior: transBehavior },
    );
  } catch (e) {
    throw transformError(e, "Error al actualizar registros de trabajos", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}
