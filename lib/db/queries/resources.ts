import db, { Database } from "@/lib/db";
import { activityRegistries_table } from "@/lib/db/schema/activity-registry";
import { taskRegistries_table } from "@/lib/db/schema/task-registry";
import {
  companies_table,
  vehicles_table,
  tasks_table,
  activities_table,
  itineraries_table,
  vehicles_companies_table,
} from "@/lib/db/schema/resources";
import { sql } from "drizzle-orm";
import { jobRegistries_table } from "@/lib/db/schema/job-registry";

// There is work on this bug https://github.com/drizzle-team/drizzle-orm/pull/1703
export function getAllItineraries(scope: Database = db) {
  return scope
    .select({
      id: itineraries_table.id,
      name: itineraries_table.name,
      actCount: sql`(
        SELECT COUNT(*)
        FROM ${activities_table}
        WHERE ${activities_table.itineraryId} = ts_itinerary.id
      )`.mapWith(Number),
    })
    .from(itineraries_table);
}

export function getItineraryActivitiesForJobRegistryId(
  jobRegistryId: number,
  scope: Database = db,
) {
  return scope
    .select({
      id: activities_table.id,
      name: activities_table.name,
      itineraryid: activities_table.itineraryId,

      totalTasks: sql`(
        SELECT COUNT(*)
        FROM ${tasks_table}
        WHERE ${tasks_table.activityId} = ${activities_table.id}
      )`.mapWith(Number),

      completedTasks: sql`(
        SELECT COUNT(*)
        FROM ${taskRegistries_table}
        WHERE ${taskRegistries_table.activityRegistryId} = ${activityRegistries_table.id}
      )`.mapWith(Number),

      registerId: activityRegistries_table.id,
    })
    .from(activities_table)
    .leftJoin(
      activityRegistries_table,
      sql`${activityRegistries_table.activityId} = ${activities_table.id} AND ${activityRegistries_table.jobRegistryId} = ${jobRegistryId}`,
    ).where(sql`${activities_table.itineraryId} = (
        SELECT ${jobRegistries_table.itineraryId}
        FROM ${jobRegistries_table}
        WHERE ${jobRegistries_table.id} = ${jobRegistryId}
        LIMIT 1
      )
    `);
}

export function getActivityTasks(
  activityId: number,
  actRegId: number = 0,
  scope: Database = db,
) {
  return scope
    .select({
      id: tasks_table.id,
      name: tasks_table.name,
      completed:
        sql`COALESCE(${taskRegistries_table.completed}, false)`.mapWith(
          Boolean,
        ),
      observation:
        sql`COALESCE(${taskRegistries_table.observation}, '')`.mapWith(String),
      disabled: sql`COALESCE(${taskRegistries_table.completed}, false)`.mapWith(
        Boolean,
      ),
    })
    .from(tasks_table)
    .leftJoin(
      taskRegistries_table,
      sql`${taskRegistries_table.taskId} = ${tasks_table.id} AND ${taskRegistries_table.activityRegistryId} = ${actRegId}`,
    )
    .where(sql`${tasks_table.activityId} = ${activityId}`);
}

export function getAllCompanies(scope: Database = db) {
  return scope.select().from(companies_table);
}

export function getAllVehicles(companyId: number, scope: Database = db) {
  const condition =
    companyId === 0
      ? sql`1`
      : sql`${vehicles_table.id} IN (
        SELECT ${vehicles_companies_table.vehicleId}
        FROM ${vehicles_companies_table}
        WHERE ${vehicles_companies_table.companyId} = ${companyId}
      )`;

  return db.select().from(vehicles_table).where(condition);
}
