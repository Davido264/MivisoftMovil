import db, { Database } from "@/lib/db";
import { RemoteActivity } from "@/lib/odoo/act-registry";
import {
  activities_table,
  itineraries_table,
  tasks_table,
  companies_table,
  vehicles_table,
} from "@/lib/db/schema/resources";
import { sql } from "drizzle-orm";
import {
  RemoteCompany,
  RemoteItinerary,
  RemoteVehicle,
} from "@/lib/odoo/itinerary-company-vehicles";
import { RemoteTask } from "@/lib/odoo/task-registry";

export async function upsertActivities(
  acts: RemoteActivity[],
  scope: Database = db,
) {
  return scope
    .insert(activities_table)
    .values(
      acts.map((a) => ({
        id: a.id,
        name: a.name,
        itineraryId: a.itinerary_id,
      })),
    )
    .onConflictDoUpdate({
      target: activities_table.id,
      set: {
        name: sql`excluded.name`,
        itineraryId: sql`excluded.itineraryId`,
      },
    });
}

export async function deleteNonRemobeActivities(
  ids: number[],
  scope: Database = db,
) {
  return scope
    .delete(activities_table)
    .where(sql`${activities_table.id} NOT IN ${ids}`);
}

export async function upsertVehicles(v: RemoteVehicle[], scope: Database = db) {
  return scope
    .insert(vehicles_table)
    .values(
      v.map((i) => ({
        id: i.id,
        name: i.name,
        companyId: i.company_id,
      })),
    )
    .onConflictDoUpdate({
      target: vehicles_table.id,
      set: {
        name: sql`excluded.name`,
        companyId: sql`excluded.companyId`,
      },
    });
}

export async function deleteNonRemoteVehicles(
  ids: number[],
  scope: Database = db,
) {
  return scope
    .delete(vehicles_table)
    .where(sql`${vehicles_table.id} NOT IN ${ids}`);
}

export async function upsertCompanies(
  c: RemoteCompany[],
  scope: Database = db,
) {
  return scope
    .insert(companies_table)
    .values(c)
    .onConflictDoUpdate({
      target: companies_table.id,
      set: { name: sql`excluded.name` },
    });
}

export async function deleteNonRemoteCompanies(
  ids: number[],
  scope: Database = db,
) {
  return scope
    .delete(companies_table)
    .where(sql`${companies_table.id} NOT IN ${ids}`);
}

export async function upsertItineraries(
  remoteItineraries: RemoteItinerary[],
  scope: Database = db,
) {
  return scope
    .insert(itineraries_table)
    .values(remoteItineraries)
    .onConflictDoUpdate({
      target: itineraries_table.id,
      set: { name: sql`excluded.name` },
    });
}

export async function deleteNonRemoteItineraries(
  ids: number[],
  scope: Database = db,
) {
  return scope
    .delete(itineraries_table)
    .where(sql`${itineraries_table.id} NOT IN ${ids}`);
}

export async function upsertRemoteTasks(t: RemoteTask[], scope: Database = db) {
  return scope
    .insert(tasks_table)
    .values(
      t.map((i) => ({
        id: i.id,
        name: i.name,
        activityId: i.activity_id,
      })),
    )
    .onConflictDoUpdate({
      target: tasks_table.id,
      set: {
        name: sql`excluded.name`,
        activityId: sql`excluded.activityId`,
      },
    });
}

export async function deleteNonRemoteTasks(
  ids: number[],
  scope: Database = db,
) {
  return scope.delete(tasks_table).where(sql`${tasks_table.id} NOT IN ${ids}`);
}
