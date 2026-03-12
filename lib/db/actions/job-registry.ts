import { formatOdoo } from "@/lib/date";
import db, { Database } from "@/lib/db";
import {
  jobRegistries_table,
  JobRegistryInsert,
  JobRegistrySelect,
} from "@/lib/db/schema/job-registry";
import { RemoteJobReg } from "@/lib/odoo/job-registry";
import { sql } from "drizzle-orm";
import { dateObj } from "./utils";

export async function insertJobRegistry(
  insert: JobRegistryInsert,
  sync: boolean = false,
  scope: Database = db,
) {
  return await scope
    .insert(jobRegistries_table)
    .values({ ...insert, ...dateObj(sync) })
    .returning({ id: jobRegistries_table.id })
    .then((result) => result[0].id);
}

export async function updateJobRegistry(
  jobRegistryId: number,
  update: Partial<JobRegistryInsert>,
  sync: boolean = false,
  priority: boolean = false,
  scope: Database = db,
) {
  return await scope
    .update(jobRegistries_table)
    .set({
      ...update,
      ...dateObj(sync),
      ...(priority ? { priority: new Date() } : {}),
    })
    .where(sql`${jobRegistries_table.id} = ${jobRegistryId}`);
}

export function purgeDeletedJobRegistries(
  jobRegistryIds: number[],
  scope: Database = db,
) {
  if (jobRegistryIds.length === 0) {
    return;
  }

  return scope
    .delete(jobRegistries_table)
    .where(
      sql`${jobRegistries_table.odooId} NOT IN ${jobRegistryIds} AND ${jobRegistries_table.odooId} IS NOT NULL`,
    );
}

export function remotifyJobRegistry(jobRegistry: JobRegistrySelect) {
  return {
    id: jobRegistry.odooId,
    itinerary_id: jobRegistry.itineraryId,
    user_id: jobRegistry.userId,
    start_datetime: formatOdoo(jobRegistry.startDate),
    end_datetime:
      jobRegistry.endDate != null ? formatOdoo(jobRegistry.endDate) : undefined,
    observation: jobRegistry.observation,
    score: jobRegistry.score != null ? jobRegistry.score : 0,
    fleet_vehicle_id: jobRegistry.vehicleId,
    company_id: jobRegistry.companyId,
  } as RemoteJobReg;
}

export function prepareJobRegistryUpdatePayload(
  jobRegistry: JobRegistrySelect,
) {
  return {
    id: jobRegistry.odooId,
    start_datetime: formatOdoo(jobRegistry.startDate),
    end_datetime:
      jobRegistry.endDate != null ? formatOdoo(jobRegistry.endDate) : undefined,
    observation: jobRegistry.observation,
    score: jobRegistry.score != null ? jobRegistry.score : 0,
  } as RemoteJobReg;
}

export async function updateJobRegistryLastSync(
  jobRegistryIds: number[],
  scope: Database = db,
) {
  if (jobRegistryIds.length === 0) {
    return;
  }

  await scope
    .update(jobRegistries_table)
    .set({ lastsync: new Date() })
    .where(sql`${jobRegistries_table.id} IN ${jobRegistryIds}`);
}
