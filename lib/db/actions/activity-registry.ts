import db, { Database } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  activityRegistries_table,
  ActivityRegistryInsert,
  ActivityRegistrySelect,
} from "@/lib/db/schema/activity-registry";
import { updateJobRegistryPriority } from "@/lib/db/actions/job-registry";
import { RemoteActivityRegistry } from "@/lib/odoo/act-registry";
import { dateObj } from "@/lib/db/actions/utils";

export function upsertActivityRegistry(
  insert: ActivityRegistryInsert,
  sync: boolean = false,
  scope: Database = db,
) {
  return scope.transaction(async (tx) => {
    const returningId = tx
      .insert(activityRegistries_table)
      .values({ ...insert, ...dateObj(sync) })
      .onConflictDoUpdate({
        target: [
          activityRegistries_table.jobRegistryId,
          activityRegistries_table.activityId,
        ],
        set: {
          observation: sql`excluded.observation`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          lastmod: new Date(),
        },
      })
      .returning({ id: activityRegistries_table.id })
      .then((r) => r[0].id);

    if (insert.jobRegistryId) {
      await updateJobRegistryPriority(insert.jobRegistryId, tx);
    }
    return returningId;
  });
}

export function updateActivityRegistry(
  activityregistryid: number,
  update: Partial<ActivityRegistryInsert>,
  sync: boolean = false,
  scope: Database = db,
) {
  return scope.transaction(async (tx) => {
    const returningId = await tx
      .update(activityRegistries_table)
      .set({ ...update, ...dateObj(sync) })
      .where(sql`${activityRegistries_table.id} = ${activityregistryid}`)
      .returning({ id: activityRegistries_table.id })
      .then((r) => r[0].id);

    if (update.jobRegistryId) {
      await updateJobRegistryPriority(update.jobRegistryId, tx);
    }
    return returningId;
  });
}

export async function updateActivityRegistryPriority(
  activityRegistryId: number,
  scope: Database = db,
) {
  const jobRegistryId = await scope
    .select({ jobRegistryId: activityRegistries_table.jobRegistryId })
    .from(activityRegistries_table)
    .where(sql`${activityRegistries_table.id} = ${activityRegistryId}`)
    .then((r) => (r.length > 0 ? r[0].jobRegistryId : undefined));

  if (jobRegistryId !== undefined) {
    await updateJobRegistryPriority(jobRegistryId!, scope);
  }
}

export function purgeDeletedActivityRegistries(
  activityIds: number[],
  scope: Database = db,
) {
  return scope
    .delete(activityRegistries_table)
    .where(
      sql`${activityRegistries_table.odooId} NOT IN ${activityIds} AND ${activityRegistries_table.odooId} IS NOT NULL`,
    );
}

export function remotifyActivityRegistry(activity: ActivityRegistrySelect) {
  return {
    id: activity.odooId,
    job_registry_id: activity.jobRegistryId,
    activity_id: activity.activityId,
    lat: activity.lat,
    lng: activity.lng,
    observation: activity.observation,
  } as RemoteActivityRegistry;
}
