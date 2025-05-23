import { sql } from "drizzle-orm";
import { photos_table } from "@/lib/db/schema/photos";
import db, { Database } from "@/lib/db";

export function getImagesForJobRegistry(
  jobRegistryId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(photos_table)
    .where(sql`${photos_table.jobRegistryId} = ${jobRegistryId}`);
}

export function getImagesForActivityRegistry(
  activityRegistryId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(photos_table)
    .where(sql`${photos_table.activityRegistryId} = ${activityRegistryId}`);
}

export function getImagesForWorktimeRegistry(
  worktimeRegistryId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(photos_table)
    .where(sql`${photos_table.worktimeRegistryId} = ${worktimeRegistryId}`);
}
