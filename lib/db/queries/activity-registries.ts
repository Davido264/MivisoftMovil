import db, { Database } from "@/lib/db";
import { activityRegistries_table } from "@/lib/db/schema/activity-registry";
import { sql } from "drizzle-orm";

export function getActivityRegistry(actregid: number, scope: Database = db) {
  return scope
    .select()
    .from(activityRegistries_table)
    .where(sql`${activityRegistries_table.id} = ${actregid}`);
}

export async function getLocalActivityFromRegistryOdooId(
  odooId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(activityRegistries_table)
    .where(sql`${activityRegistries_table.odooId} = ${odooId}`)
    .limit(1)
    .then((result) => (result.length > 0 ? result[0] : undefined));
}

export async function getActivityRegistryOdooId(
  id: number,
  scope: Database = db,
) {
  return scope
    .select({ odooid: activityRegistries_table.odooId })
    .from(activityRegistries_table)
    .where(sql`${activityRegistries_table.id} = ${id}`)
    .then((r) => r[0].odooid);
}

export function getAllPendingActivityRegistries(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(activityRegistries_table)
    .where(
      sql`${activityRegistries_table.odooId} IS NULL OR ${activityRegistries_table.lastmod} > ${activityRegistries_table.lastsync}`,
    )
    .orderBy(sql`${activityRegistries_table.lastmod} DESC`);
}

export function getActivityRegistryCount(
  jobRegistryId: number,
  scope: Database = db,
) {
  return scope
    .select({ count: sql`COUNT(*)`.mapWith(Number) })
    .from(activityRegistries_table)
    .where(sql`${activityRegistries_table.jobRegistryId} = ${jobRegistryId}`)
    .then((r) => r[0].count);
}
