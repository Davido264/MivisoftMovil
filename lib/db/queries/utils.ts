import db, { Database } from "@/lib/db";
import { activityRegistries_table } from "@/lib/db/schema/activity-registry";
import { jobRegistries_table } from "@/lib/db/schema/job-registry";
import { taskRegistries_table } from "@/lib/db/schema/task-registry";
import { worktimeRegistries_table } from "@/lib/db/schema/worktime-registry";
import { sql } from "drizzle-orm";
import { union } from "drizzle-orm/sqlite-core";
import { photos_table } from "../schema/photos";

export async function countPending(userId: number, scope: Database = db) {
  const worktimePending = scope
    .select({ id: worktimeRegistries_table.id })
    .from(worktimeRegistries_table)
    .where(
      sql`(${worktimeRegistries_table.lastsync} IS NULL OR ${worktimeRegistries_table.lastsync} < ${worktimeRegistries_table.lastmod}) AND ${worktimeRegistries_table.userId} = ${userId}`,
    );

  const jobRegistryPending = scope
    .select({ id: jobRegistries_table.id })
    .from(jobRegistries_table)
    .where(
      sql`(${jobRegistries_table.odooId} IS NULL OR ${jobRegistries_table.lastsync} < ${jobRegistries_table.lastmod}) AND ${jobRegistries_table.userId} = ${userId}`,
    );

  const activityRegistryPending = scope
    .select({ id: activityRegistries_table.id })
    .from(activityRegistries_table)
    .where(
      sql`(${activityRegistries_table.odooId} IS NULL OR ${activityRegistries_table.lastsync} < ${activityRegistries_table.lastmod}) AND ${activityRegistries_table.userId} = ${userId}`,
    );

  const taskRegistryPending = scope
    .select({ id: taskRegistries_table.id })
    .from(taskRegistries_table)
    .where(
      sql`(${taskRegistries_table.odooId} IS NULL OR ${taskRegistries_table.lastsync} < ${taskRegistries_table.lastmod}) AND ${taskRegistries_table.userId} = ${userId}`,
    );

  const photosPending = scope
    .select({ id: photos_table.id })
    .from(photos_table)
    .where(
      sql`${photos_table.dirty} = ${true} AND ${photos_table.userId} = ${userId}`,
    );

  const u = union(
    worktimePending,
    jobRegistryPending,
    activityRegistryPending,
    taskRegistryPending,
    photosPending,
  );

  return scope
    .select({ count: sql`COUNT(*)`.mapWith(Number) })
    .from(u.as("u"))
    .then((res) => res[0].count);
}
