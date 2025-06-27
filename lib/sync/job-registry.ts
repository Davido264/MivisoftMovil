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
import { ResultAsync } from "neverthrow";
import { transformError } from "../result";

export function reconciliateJobRegistries(
  remoteEntities: RemoteJobReg[],
) {
  const r = db.transaction(
    async (tx) => {
      for (const remote of remoteEntities) {
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

        assert.notNull(local.lastsync);
        if (
          local.lastmod <= local.lastsync &&
          remote.lastmod <= local.lastsync
        ) {
          continue; // all synced
        }

        if (local.lastmod > local.lastsync) {
          // TODO: For now, local wins always
          continue;
        }

        if (local.lastmod > local.lastsync && remote.lastmod > local.lastsync) {
          // TODO: Conflict resolution
          continue;
        }

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
          tx,
        );
      }

      await purgeDeletedJobRegistries(
        remoteEntities.map((i) => i.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );

  return ResultAsync.fromPromise(r, (e) => transformError(e, "Error al actualizar registros de trabajos"));
}
