import db, { transBehavior } from "@/lib/db";
import { RemoteWorktimeRegistry } from "@/lib/odoo/worktime-registry";
import { parseOdoo } from "@/lib/date";
import { getLocalWorktimeRegistryFromDaySerial } from "@/lib/db/queries/worktime-registry";
import {
  insertWorktimeRegistry,
  updateWorktimeRegistry,
} from "@/lib/db/actions/worktime-registry";
import { transformError } from "@/lib/result";
import { Logger } from "@/lib/logger";
import { hasLocalChanges } from "@/lib/db/actions/utils";

export async function reconciliate(remote: RemoteWorktimeRegistry | undefined) {
  const pop = Logger.startSubStackTrace("worktime-registry::reconciliate");
  try {
    await db.transaction(
      async (tx) => {
        if (remote === undefined) {
          return;
        }

        const local = await getLocalWorktimeRegistryFromDaySerial(
          remote.day,
          remote.serial,
          remote.user_id,
          tx,
        ).then((result) => (result.length > 0 ? result[0] : undefined));

        if (local === undefined) {
          await insertWorktimeRegistry(
            {
              odooId: remote.id,
              day: remote.day,
              userId: remote.user_id,
              serial: remote.serial,
              observation: remote.observation,
              startDate: parseOdoo(remote.start_datetime),
              startLat: remote.start_lat,
              startLng: remote.start_lng,
              endDate:
                typeof remote.end_datetime === "string"
                  ? parseOdoo(remote.end_datetime)
                  : null,
              endLat:
                typeof remote.end_lat === "number" ? remote.end_lat : null,
              endLng:
                typeof remote.end_lng === "number" ? remote.end_lng : null,
            },
            true,
            tx,
          );
          return;
        }

        // local.lastsync ??= new Date(0);
        // if (
        //   local.lastmod <= local.lastsync &&
        //   remote.lastmod <= local.lastsync
        // ) {
        //   return; // all synced
        // }

        // if (local.lastmod > local.lastsync) {
        //   // TODO: for now, local always win
        //   return;
        // }

        // if (local.lastmod > local.lastsync && remote.lastmod > local.lastsync) {
        //   // TODO: Conflict resolution
        //   return;
        // }

        // Cambios locales sin subir ganan: no pisar la jornada local (p.ej. una
        // abierta) con la versión remota. Esto evita que un sync cierre/altere
        // la jornada en curso y rompa acciones como registrar actividad.
        if (hasLocalChanges(local)) return;

        await updateWorktimeRegistry(
          local.id,
          {
            odooId: remote.id,
            day: remote.day,
            userId: remote.user_id,
            serial: remote.serial,
            observation: remote.observation,
            startDate: parseOdoo(remote.start_datetime),
            startLat: remote.start_lat,
            startLng: remote.start_lng,
            endDate:
              typeof remote.end_datetime === "string"
                ? parseOdoo(remote.end_datetime)
                : null,
            endLat: typeof remote.end_lat === "number" ? remote.end_lat : null,
            endLng: typeof remote.end_lng === "number" ? remote.end_lng : null,
          },
          true,
          tx,
        );
      },
      { behavior: transBehavior },
    );
  } catch (e) {
    throw transformError(e, "Error al actualizar registros de jornadas", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}
