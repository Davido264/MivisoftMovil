import db, { Database } from "@/lib/db";
import {
  jobRegistries_table,
  JobRegistryInsert,
} from "@/lib/db/schema/job-registry";
import { activityRegistries_table } from "@/lib/db/schema/activity-registry";
import { taskRegistries_table } from "@/lib/db/schema/task-registry";
import { users_table } from "@/lib/db/schema/user-session";
import {
  companies_table,
  vehicles_table,
  tasks_table,
  itineraries_table,
  activities_table,
} from "@/lib/db/schema/resources";
import { sql } from "drizzle-orm";

export type JobRegistryState = {
  id: number;
  serverId: number | null;
  name: string;
  startDate: Date;
  endDate: Date | null;
  userId: number;
  userName: string;
  itineraryId: number;
  itineraryName: string;
  companyId: number;
  companyName: string;
  vehicleId: number;
  vehicleName: string;
  score: number | null;
  totalActivities: number;
  completedActivities: number;
};

export function getAllJobRegistries(scope: Database = db) {
  return scope
    .select(selection)
    .from(jobRegistries_table)
    .innerJoin(
      users_table,
      sql`${users_table.id} = ${jobRegistries_table.userId}`,
    )
    .innerJoin(
      itineraries_table,
      sql`${itineraries_table.id} = ${jobRegistries_table.itineraryId}`,
    )
    .innerJoin(
      companies_table,
      sql`${companies_table.id} = ${jobRegistries_table.companyId}`,
    )
    .innerJoin(
      vehicles_table,
      sql`${vehicles_table.id} = ${jobRegistries_table.vehicleId}`,
    )
    .orderBy(sql`${jobRegistries_table.priority} DESC`);
}

export function getLatestOpenJobRegistryForUser(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select(selection)
    .from(jobRegistries_table)
    .innerJoin(
      users_table,
      sql`${users_table.id} = ${jobRegistries_table.userId}`,
    )
    .innerJoin(
      itineraries_table,
      sql`${itineraries_table.id} = ${jobRegistries_table.itineraryId}`,
    )
    .innerJoin(
      companies_table,
      sql`${companies_table.id} = ${jobRegistries_table.companyId}`,
    )
    .innerJoin(
      vehicles_table,
      sql`${vehicles_table.id} = ${jobRegistries_table.vehicleId}`,
    )
    .where(
      sql`${jobRegistries_table.userId} = ${userId} AND ${jobRegistries_table.endDate} IS NULL`,
    )
    .orderBy(sql`${jobRegistries_table.priority} DESC`)
    .limit(1);
}

export function getEndDateTimesOdooIdsAndIds(
  jobRegistryIds: number[],
  scope: Database = db,
) {
  return scope
    .select({
      endDateTime: jobRegistries_table.endDate,
      odooId: jobRegistries_table.odooId,
      localId: jobRegistries_table.id,
    })
    .from(jobRegistries_table)
    .where(
      sql`${jobRegistries_table.id} IN ${jobRegistryIds} AND ${jobRegistries_table.endDate} IS NOT NULL AND ${jobRegistries_table.odooId} IS NOT NULL`,
    );
}

export function getObservationForJobRegistry(
  jobRegistryId: number,
  scope: Database = db,
) {
  return scope
    .select({ observation: jobRegistries_table.observation })
    .from(jobRegistries_table)
    .where(sql`${jobRegistries_table.id} = ${jobRegistryId}`);
}

export async function getLocalJobRegistryFromOdooId(
  serverId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(jobRegistries_table)
    .where(sql`${jobRegistries_table.odooId} = ${serverId}`)
    .limit(1)
    .then((result) => (result.length > 0 ? result[0] : undefined));
}

export async function getJobRegistryOdooId(id: number, scope: Database = db) {
  return scope
    .select({ odooid: jobRegistries_table.odooId })
    .from(jobRegistries_table)
    .where(sql`${jobRegistries_table.id} = ${id}`)
    .then((r) => r[0].odooid);
}

export function getPendingJobRegistryCreations(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(jobRegistries_table)
    .where(
      sql`${jobRegistries_table.odooId} IS NULL`,
    )
    .orderBy(sql`${jobRegistries_table.lastmod} DESC`);
}

export function getAllPendingJobRegistryUpdates(
  userId: number,
  scope: Database = db,
) {
  return scope
    .select()
    .from(jobRegistries_table)
    .where(
      sql`${jobRegistries_table.odooId} IS NOT NULL AND ${jobRegistries_table.lastmod} > ${jobRegistries_table.lastsync}`,
    )
    .orderBy(sql`${jobRegistries_table.lastmod} DESC`);
}

const selection = {
  id: jobRegistries_table.id,
  serverId: jobRegistries_table.odooId,
  name: itineraries_table.name,
  startDate: jobRegistries_table.startDate,
  endDate: jobRegistries_table.endDate,
  userId: jobRegistries_table.userId,
  userName: users_table.name,
  score: jobRegistries_table.score,
  itineraryId: jobRegistries_table.itineraryId,
  itineraryName: itineraries_table.name,
  companyId: jobRegistries_table.companyId,
  companyName: companies_table.name,
  vehicleId: jobRegistries_table.vehicleId,
  vehicleName: vehicles_table.name,

  totalActivities: sql`(
     SELECT COUNT(*)
     FROM ${activities_table}
     WHERE ${activities_table.itineraryId} = ${jobRegistries_table.itineraryId}
  )`.mapWith(Number),

  completedActivities: sql`(
    SELECT COUNT(*)
    FROM ${activityRegistries_table}
    WHERE ${activityRegistries_table.jobRegistryId} = ${jobRegistries_table.id} AND ((
      SELECT COUNT(*)
      FROM ${tasks_table}
      WHERE ${tasks_table.activityId} = ${activityRegistries_table.activityId}
    ) = 0 OR (
      SELECT COUNT(*)
      FROM ${taskRegistries_table}
      WHERE ${taskRegistries_table.activityRegistryId} = ${activityRegistries_table.id}
    ) = (
      SELECT COUNT(*)
      FROM ${tasks_table}
      WHERE ${tasks_table.activityId} = ${activityRegistries_table.activityId}
    ))
  )`.mapWith(Number),
};
