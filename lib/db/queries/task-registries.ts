import db, { Database } from "@/lib/db";
import { taskRegistries_table } from "@/lib/db/schema/task-registry";
import { sql } from "drizzle-orm";

export async function getLocalTaskRegistryFromOdooId(
  odooId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(taskRegistries_table)
    .where(sql`${taskRegistries_table.odooId} = ${odooId}`)
    .limit(1)
    .then((result) => (result.length > 0 ? result[0] : undefined));
}

export async function getTaskRegistryForActivityRegistryAndTask(
  activityRegistryId: number,
  taskId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(taskRegistries_table)
    .where(
      sql`${taskRegistries_table.activityRegistryId} = ${activityRegistryId} AND ${taskRegistries_table.taskId} = ${taskId}`,
    )
    .limit(1)
    .then((result) => (result.length > 0 ? result[0] : undefined));
}

export function getAllPendingTaskRegistries(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(taskRegistries_table)
    .where(
      sql`${taskRegistries_table.odooId} IS NULL`,
    )
    .orderBy(sql`${taskRegistries_table.lastmod} DESC`);
}

export function getAllPendingTaskRegistryUpdates(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(taskRegistries_table)
    .where(
      sql`${taskRegistries_table.odooId} IS NOT NULL`,
    )
    .orderBy(sql`${taskRegistries_table.lastmod} DESC`);
}
