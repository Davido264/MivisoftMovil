import db, { transBehavior } from "@/lib/db";
import { RemoteWorktimeRegistry } from "@/lib/odoo/worktime-registry";
import { parseOdoo } from "@/lib/date";
import { getLocalWorktimeRegistryFromDaySerial } from "@/lib/db/queries/worktime-registry";
import {
  insertWorktimeRegistry,
  updateWorktimeRegistry,
} from "@/lib/db/actions/worktime-registry";
import assert from "@/lib/assert";
import { ResultAsync } from "neverthrow";
import { transformError } from "@/lib/result";

export function reconciliate(
  remote: RemoteWorktimeRegistry | undefined,
  userId: number,
) {
  const r = db.transaction(
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
            endDate: remote.end_datetime
              ? parseOdoo(remote.end_datetime)
              : null,
            endLat: remote.end_lat,
            endLng: remote.end_lng,
          },
          true,
          tx,
        );
        return;
      }

      assert.notNull(local.lastsync);
      if (local.lastmod <= local.lastsync && remote.lastmod <= local.lastsync) {
        return; // all synced
      }

      if (local.lastmod > local.lastsync) {
        // TODO: for now, local always win
        return;
      }

      if (local.lastmod > local.lastsync && remote.lastmod > local.lastsync) {
        // TODO: Conflict resolution
        return;
      }

      await updateWorktimeRegistry(
        local.id,
        {
          day: remote.day,
          userId: remote.user_id,
          serial: remote.serial,
          observation: remote.observation,
          startDate: parseOdoo(remote.start_datetime),
          startLat: remote.start_lat,
          startLng: remote.start_lng,
          endDate: remote.end_datetime ? parseOdoo(remote.end_datetime) : null,
          endLat: remote.end_lat,
          endLng: remote.end_lng,
        },
        true,
        tx,
      );
    },
    { behavior: transBehavior },
  );

  return ResultAsync.fromPromise(r, (e) =>
    transformError(e, "Error al actualizar registros de jornadas"),
  );
}
