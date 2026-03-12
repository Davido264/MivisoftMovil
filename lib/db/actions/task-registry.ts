import db, { Database, transBehavior } from "@/lib/db";
import {
  taskRegistries_table,
  TaskRegistryInsert,
  TaskRegistrySelect,
} from "@/lib/db/schema/task-registry";
import { sql } from "drizzle-orm";
import { updateActivityRegistry } from "./activity-registry";
import { RemoteTaskRegistry } from "@/lib/odoo/task-registry";
import { formatOdoo } from "@/lib/date";
import { dateObj } from "@/lib/db/actions/utils";

export async function insertTaskRegistries(
  insert: TaskRegistryInsert[],
  sync: boolean = false,
  scope: Database = db,
) {
  if (insert.length == 0) {
    return;
  }

  return scope.transaction(
    async (tx) => {
      const result = await tx
        .insert(taskRegistries_table)
        .values(insert.map((i) => ({ ...i, ...dateObj(sync) })))
        .onConflictDoUpdate({
          target: taskRegistries_table.id,
          set: {
            observation: sql`excluded.observation`,
            completed: sql`excluded.completed`,
            completedDate: sql`excluded.completedDate`,
            lastmod: new Date(),
          },
        })
        .returning({ id: taskRegistries_table.id })
        .then((r) => r[0].id);

      for (const id of new Set(
        insert.map((i) => i.activityRegistryId),
      ).values()) {
        await updateActivityRegistry(id, {}, false, tx);
      }

      return result;
    },
    { behavior: transBehavior },
  );
}

export async function updateTaskRegistry(
  taskRegistryId: number,
  update: Partial<TaskRegistryInsert>,
  sync: boolean = false,
  scope: Database = db,
) {
  return scope.transaction(
    async (tx) => {
      const result = await tx
        .update(taskRegistries_table)
        .set({ ...update, ...dateObj(sync) })
        .where(sql`${taskRegistries_table.id} = ${taskRegistryId}`)
        .returning({ id: taskRegistries_table.id })
        .then((r) => r[0].id);

      if (update.activityRegistryId) {
        await updateActivityRegistry(update.activityRegistryId, {}, false, tx);
      }
      return result;
    },
    { behavior: transBehavior },
  );
}

export async function updateTaskRegistryLastSync(
  taskRegistryIds: number[],
  scope: Database = db,
) {
  if (taskRegistryIds.length === 0) {
    return;
  }

  await scope
    .update(taskRegistries_table)
    .set({ lastsync: new Date() })
    .where(sql`${taskRegistries_table.id} IN ${taskRegistryIds}`);
}

export async function purgeDeletedTaskRegistries(
  taskIds: number[],
  scope: Database = db,
) {
  if (taskIds.length === 0) {
    return [];
  }

  return scope
    .delete(taskRegistries_table)
    .where(
      sql`${taskRegistries_table.odooId} NOT IN ${taskIds} AND ${taskRegistries_table.odooId} IS NOT NULL`,
    )
    .returning({ id: taskRegistries_table.id })
    .then((r) => r.map((i) => i.id));
}

export function remotifyTaskRegistry(taskRegistry: TaskRegistryInsert) {
  return {
    id: taskRegistry.odooId,
    completed: taskRegistry.completed,
    completed_date: taskRegistry.completedDate
      ? formatOdoo(taskRegistry.completedDate)
      : false,
    observation: taskRegistry.observation,
    task_id: taskRegistry.taskId,
    activity_registry_id: taskRegistry.activityRegistryId,
  } as RemoteTaskRegistry;
}

export function prepareTaskRegistryUpdatePayload(
  taskRegistry: TaskRegistrySelect,
) {
  return {
    id: taskRegistry.odooId,
    completed: taskRegistry.completed,
    completed_date: taskRegistry.completedDate
      ? formatOdoo(taskRegistry.completedDate)
      : false,
    observation: taskRegistry.observation,
  } as RemoteTaskRegistry;
}
