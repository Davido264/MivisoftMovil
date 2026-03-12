import assert from "@/lib/assert";
import { computeYYYYMMDD, dateFromYYYYMMDD, parseOdoo } from "@/lib/date";
import { transformError } from "../result";
import { Env, RemoteWorktimeRegistry } from "./env";
import { Environment } from "./_env";

export { RemoteWorktimeRegistry } from "./env";

export async function fetchLatestWorktimeRegistry(
  env: Environment<Env>,
  userId: number,
  timezone: string,
) {
  try {
    const worktimes = await env[
      "technical_support.worktime_registry"
    ].searchRead([["user_id", "=", userId]], ["id", "start_datetime"], {
      order: "start_datetime desc",
      limit: 1,
    });

    const wt = worktimes.length > 0 ? worktimes[0] : undefined;
    if (wt === undefined) {
      return;
    }

    const { id: wtId, start_datetime: wtStart } = wt as any;
    const day = computeYYYYMMDD(parseOdoo(wtStart), timezone);

    assert.notNull(wtId, "wtId");
    assert.notNull(wtStart, "wtStart");

    const timeWindows = await env["technical_support.time_window"].searchRead(
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
  } catch (error) {
    throw transformError(error, "Error al obtener registros de jornadas");
  }
}

export async function bulkUploadWorktimeRegistries(
  env: Environment<Env>,
  records: Omit<
    RemoteWorktimeRegistry,
    "id" | "lastmod" | "job_registry_ids"
  >[],
) {
  try {
    const result = await env["technical_support.worktime_registry"].call_kw(
      "bulk_upload",
      [records],
    );
    return result as number;
  } catch (error) {
    throw transformError(error, "Error al subir registros de jornadas");
  }
}

export async function getJobRegistriesLinkedToWorktimeRegistry(
  env: Environment<Env>,
  userId: number,
  uuid: string,
) {
  try {
    const worktimeRegistryId = await env[
      "technical_support.worktime_registry"
    ].searchRead(
      [
        ["user_id", "=", userId],
        ["uuid", "=", uuid],
      ],
      ["job_registry_ids"],
    );

    if (worktimeRegistryId.length === 0) {
      return new Set<number>();
    }

    assert(
      worktimeRegistryId.length === 1,
      "Multiple worktime registries found",
    );

    return new Set<number>(
      (worktimeRegistryId[0] as any).job_registry_ids.map((r: any) => r[0]),
    );
  } catch (error) {
    throw transformError(error, "Error al obtener registros de jornadas");
  }
}

export async function linkJobRegistryToWorktimeRegistry(
  env: Environment<Env>,
  userId: number,
  day: number,
  jobRegistryIds: number[],
) {
  try {
    const startDate = dateFromYYYYMMDD(day);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const worktimeRegistryId = await env[
      "technical_support.worktime_registry"
    ].search([
      ["user_id", "=", userId],
      ["start_datetime", ">=", startDate],
      ["start_datetime", "<", endDate],
    ]);

    if (worktimeRegistryId.length === 0) {
      return;
    }

    assert(
      worktimeRegistryId.length === 1,
      "Multiple worktime registries found",
    );

    await env["technical_support.worktime_registry"].update(
      worktimeRegistryId[0],
      // @ts-ignore
      {
        job_registry_ids: jobRegistryIds.map((id) => [4, id]),
      },
    );
  } catch (error) {
    throw transformError(error, "Error al actualizar registros de jornadas");
  }
}
