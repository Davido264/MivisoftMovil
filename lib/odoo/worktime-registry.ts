import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { parseOdoo, computeYYYYMMDD } from "@/lib/date";
import assert from "@/lib/assert";

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

const odooModel = "technical_support.worktime_registry";
const odooModelTw = "technical_support.time_window";

export async function fetchLatestWorktimeRegistry(
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

export async function bulkUploadWorktimeRegistries(
  client: OdooJSONRpc,
  records: RemoteWorktimeRegistry[],
) {
  const result = await client.call_kw(odooModel, "bulk_upload", [records]);
  return result[0] as number;
}
