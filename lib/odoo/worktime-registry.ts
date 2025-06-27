import assert from "@/lib/assert";
import { computeYYYYMMDD, dateFromYYYYMMDD, parseOdoo } from "@/lib/date";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { ResultAsync } from "neverthrow";
import { transformError } from "../result";

export type RemoteWorktimeRegistry = {
  id: number;
  user_id: number;
  day: number;
  serial: number;
  start_datetime: string;
  end_datetime: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  observation: string;
  lastmod: Date;
};

export function fetchLatestWorktimeRegistry(
  client: OdooJSONRpc,
  userId: number,
  timezone: string,
) {
  return ResultAsync.fromPromise(
    _internalFetchLatestWorktimeRegistry(client, userId, timezone),
    (e) => transformError(e, "Error al obtener registros de jornadas"),
  );
}

export function bulkUploadWorktimeRegistries(
  client: OdooJSONRpc,
  records: RemoteWorktimeRegistry[],
) {
  return ResultAsync.fromPromise(
    _internalBulkUploadWorktimeRegistries(client, records),
    (e) => transformError(e, "Error al subir registros de jornadas"),
  );
}

export function linkJobRegistryToWorktimeRegistry(
  client: OdooJSONRpc,
  userId: number,
  day: number,
  jobRegistryIds: number[],
) {
  return ResultAsync.fromPromise(
    _internalLinkJobRegistryToWorktimeRegistry(
      client,
      userId,
      day,
      jobRegistryIds,
    ),
    (e) => transformError(e, "Error al actualizar registros de jornadas"),
  );
}

const odooModel = "technical_support.worktime_registry";
const odooModelTw = "technical_support.time_window";

async function _internalFetchLatestWorktimeRegistry(
  client: OdooJSONRpc,
  userId: number,
  timezone: string,
) {
  const worktimes = await client.searchRead(
    odooModel,
    [["user_id", "=", userId]],
    ["id", "start_datetime"],
    { order: "start_datetime desc", limit: 1 },
  );

  const wt = worktimes.length > 0 ? worktimes[0] : undefined;
  if (wt === undefined) {
    return;
  }

  const { id: wtId, start_datetime: wtStart } = wt as any;
  const day = computeYYYYMMDD(parseOdoo(wtStart), timezone);

  assert.notNull(wtId, "wtId");
  assert.notNull(wtStart, "wtStart");

  const timeWindows = await client.searchRead(
    odooModelTw,
    [["worktime_registry_id", "=", wtId]],
    [
      "worktime_registry_id",
      "serial",
      "start_datetime",
      "end_datetime",
      "start_lat",
      "start_lng",
      "end_lat",
      "end_lng",
      "observation",
      "write_date",
    ],
    { order: "start_datetime desc", limit: 1 },
  );

  const tw = timeWindows.length > 0 ? timeWindows[0] : undefined;

  if (tw === undefined) {
    return;
  }

  return {
    day,
    user_id: userId,
    serial: (tw as any).serial,
    start_datetime: (tw as any).start_datetime,
    end_datetime: (tw as any).end_datetime,
    start_lat: (tw as any).start_lat,
    start_lng: (tw as any).start_lng,
    end_lat: (tw as any).end_lat,
    end_lng: (tw as any).end_lng,
    observation: (tw as any).observation,
    lastmod: parseOdoo((tw as any).write_date),
  } as RemoteWorktimeRegistry;
}

async function _internalBulkUploadWorktimeRegistries(
  client: OdooJSONRpc,
  records: RemoteWorktimeRegistry[],
) {
  const result = await client.call_kw(odooModel, "bulk_upload", [records]);
  return result as number;
}

async function _internalLinkJobRegistryToWorktimeRegistry(
  client: OdooJSONRpc,
  userId: number,
  day: number,
  jobRegistryIds: number[],
) {
  const startDate = dateFromYYYYMMDD(day);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  const worktimeRegistryId = await client.search(odooModel, [
    ["user_id", "=", userId],
    ["start_datetime", ">=", startDate],
    ["start_datetime", "<", endDate],
  ]);

  if (worktimeRegistryId.length === 0) {
    return;
  }

  assert(worktimeRegistryId.length === 1, "Multiple worktime registries found");

  await client.update(odooModel, worktimeRegistryId[0], {
    job_registry_ids: jobRegistryIds.map((id) => [4, id]),
  });
}
