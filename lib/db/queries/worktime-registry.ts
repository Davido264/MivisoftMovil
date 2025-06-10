import db, { Database } from "@/lib/db";
import { sql } from "drizzle-orm";
import { worktimeRegistries_table } from "@/lib/db/schema/worktime-registry";

export function getCurrentWorktimeRegistryForUser(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(worktimeRegistries_table)
    .where(
      sql`${worktimeRegistries_table.userId} = ${userId} AND ${worktimeRegistries_table.endDate} IS NULL`,
    )
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
      sql`${worktimeRegistries_table.lastsync} IS NULL OR ${worktimeRegistries_table.lastmod} > ${worktimeRegistries_table.lastsync}`,
    )
    .orderBy(sql`${worktimeRegistries_table.lastmod} DESC`);
}
