import db, { Database } from "@/lib/db";
import {
  worktimeRegistries_table,
  WorktimeRegistryInsert,
} from "@/lib/db/schema/worktime-registry";
import { getCurrentWorktimeRegistryForUser } from "@/lib/db/queries/worktime-registry";
import { sql } from "drizzle-orm";
import { RemoteWorktimeRegistry } from "@/lib/odoo/worktime-registry";
import { formatOdoo } from "@/lib/date";
import { dateObj } from "./utils";

export async function insertWorktimeRegistry(
  insert: WorktimeRegistryInsert,
  sync: boolean = false,
  scope: Database = db,
) {
  return scope
    .insert(worktimeRegistries_table)
    .values({ ...insert, ...dateObj(sync) })
    .returning({ id: worktimeRegistries_table.id })
    .then((res) => res[0].id);
}

export async function updateWorktimeRegistry(
  id: number,
  update: Partial<WorktimeRegistryInsert>,
  sync: boolean = false,
  scope: Database = db,
) {
  return scope
    .update(worktimeRegistries_table)
    .set({ ...update, ...dateObj(sync) })
    .where(sql`${worktimeRegistries_table.id} = ${id}`)
    .returning({ id: worktimeRegistries_table.id })
    .then((res) => res[0].id);
}

export async function deleteAllButLastForUser(
  userId: number,
  scope: Database = db,
) {
  const last = await getCurrentWorktimeRegistryForUser(userId, scope).then(
    (res) => (res.length > 0 ? res[0]?.id : undefined),
  );
  if (last === undefined) {
    return;
  }
  return scope
    .delete(worktimeRegistries_table)
    .where(
      sql`${worktimeRegistries_table.userId} = ${userId} AND ${worktimeRegistries_table.id} != ${last}`,
    );
}

export function remotifyWorktimeRegistry(
  worktimeRegistry: WorktimeRegistryInsert,
) {
  return {
    id: worktimeRegistry.odooId,
    user_id: worktimeRegistry.userId,
    start_datetime: formatOdoo(worktimeRegistry.startDate),
    start_lat: worktimeRegistry.startLat,
    start_lng: worktimeRegistry.startLng,
    end_datetime:
      worktimeRegistry.endDate != null
        ? formatOdoo(worktimeRegistry.endDate)
        : undefined,
    end_lat: worktimeRegistry.endLat,
    end_lng: worktimeRegistry.endLng,
    observation: worktimeRegistry.observation,
    day: worktimeRegistry.day,
    serial: worktimeRegistry.serial,
  } as RemoteWorktimeRegistry;
}
