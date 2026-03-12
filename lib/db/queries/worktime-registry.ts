import db, { Database } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  worktime_job_registry_table,
  worktimeRegistries_table,
} from "@/lib/db/schema/worktime-registry";

export function getCurrentWorktimeRegistryForUser(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(worktimeRegistries_table)
    .where(sql`${worktimeRegistries_table.userId} = ${userId}`)
    .orderBy(
      sql`${worktimeRegistries_table.day} DESC, ${worktimeRegistries_table.serial} DESC`,
    )
    .limit(1);
}

export async function getLocalWorktimeRegistryFromOdooId(
  id: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(worktimeRegistries_table)
    .where(sql`${worktimeRegistries_table.odooId} = ${id}`)
    .limit(1);
}

export async function getLocalWorktimeRegistryFromDaySerial(
  day: number,
  serial: number,
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(worktimeRegistries_table)
    .where(
      sql`${worktimeRegistries_table.serial} = ${serial} AND ${worktimeRegistries_table.day} = ${day} AND ${worktimeRegistries_table.userId} = ${userId}`,
    )
    .limit(1);
}

export function getAllPendingWorktimeRegistries(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(worktimeRegistries_table)
    .where(
      sql`${worktimeRegistries_table.lastmod} > ${worktimeRegistries_table.lastsync} OR ${worktimeRegistries_table.lastsync} IS NULL`,
    )
    .orderBy(sql`${worktimeRegistries_table.startDate} ASC`);
}

export function getAllPendingJobRegistrysOdooIdForUser(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(worktime_job_registry_table)
    .where(
      sql`${worktime_job_registry_table.odooJobRegistryId} IS NOT NULL AND ${worktime_job_registry_table.dirty} = ${true}`,
    );
}
