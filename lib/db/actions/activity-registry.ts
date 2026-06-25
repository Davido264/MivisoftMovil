import db, { Database } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  activityRegistries_table,
  ActivityRegistryInsert,
  ActivityRegistrySelect,
} from "@/lib/db/schema/activity-registry";
import { updateJobRegistry } from "@/lib/db/actions/job-registry";
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
          odooId: sql`excluded.odooId`,
          observation: sql`excluded.observation`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          ...dateObj(sync),
        },
      })
      .returning({ id: activityRegistries_table.id })
      .then((r) => r[0].id);

    // ponytail: solo marcar el job como modificado localmente en ediciones del
    // usuario (sync=false). En reconcile/descarga (sync=true) no debe ensuciarlo,
    // o pendingChanges cuenta un job fantasma tras cada sync.
    if (insert.jobRegistryId && !sync) {
      await updateJobRegistry(insert.jobRegistryId, {}, false, true, tx);
    }
    return returningId;
  });
}

export function updateActivityRegistry(
  activityregistryId: number,
  update: Partial<ActivityRegistryInsert>,
  sync: boolean = false,
  scope: Database = db,
) {
  return scope.transaction(async (tx) => {
    const returningId = await tx
      .update(activityRegistries_table)
      .set({ ...update, ...dateObj(sync) })
      .where(sql`${activityRegistries_table.id} = ${activityregistryId}`)
      .returning({ id: activityRegistries_table.id })
      .then((r) => r[0].id);

    const jobRegistryId = await tx
      .select({ id: activityRegistries_table.jobRegistryId })
      .from(activityRegistries_table)
      .where(sql`${activityRegistries_table.id} = ${activityregistryId}`)
      .then((e) => (e.length == 0 ? null : e[0].id));

    if (jobRegistryId != null && !sync) {
      await updateJobRegistry(jobRegistryId, {}, false, true, tx);
    }
    return returningId;
  });
}

export function purgeDeletedActivityRegistries(
  activityIds: number[],
  scope: Database = db,
) {
  if (activityIds.length === 0) {
    return;
  }

  return scope
    .delete(activityRegistries_table)
    .where(
      sql`${activityRegistries_table.odooId} NOT IN ${activityIds} AND ${activityRegistries_table.odooId} IS NOT NULL`,
    );
}

export async function updateActivityRegistryLastSync(
  activityRegistryIds: number[],
  scope: Database = db,
) {
  if (activityRegistryIds.length === 0) {
    return;
  }

  await scope
    .update(activityRegistries_table)
    .set({ lastsync: new Date() })
    .where(sql`${activityRegistries_table.id} IN ${activityRegistryIds}`);
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

export function prepareActivityRegistryUpdatePayload(
  activity: ActivityRegistrySelect,
) {
  return {
    id: activity.odooId,
    lat: activity.lat,
    lng: activity.lng,
    observation: activity.observation,
  } as RemoteActivityRegistry;
}
