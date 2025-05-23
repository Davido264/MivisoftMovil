import db, { transBehavior } from "@/lib/db";
import assert from "@/lib/assert";
import { RemoteTask, RemoteTaskRegistry } from "@/lib/odoo/task-registry";
import { parseOdoo } from "@/lib/date";
import { getLocalTaskRegistryFromOdooId } from "@/lib/db/queries/task-registries";
import {
  insertTaskRegistries,
  purgeDeletedTaskRegistries,
  updateTaskRegistry,
} from "@/lib/db/actions/task-registry";
import { getLocalActivityFromRegistryOdooId } from "@/lib/db/queries/activity-registries";
import {
  deleteNonRemoteTasks,
  upsertRemoteTasks,
} from "@/lib/db/actions/resources";

export async function reconciliateTaskRegistries(
  remoteEntities: RemoteTaskRegistry[],
) {
  return db.transaction(
    async (tx) => {
      for (const remote of remoteEntities) {
        assert.notNull(remote.id, "remote.id");

        const local = await getLocalTaskRegistryFromOdooId(remote.id, tx);

        if (local === undefined) {
          const activityRegistry = await getLocalActivityFromRegistryOdooId(
            remote.activity_registry_id,
            tx,
          );

          if (activityRegistry === undefined) {
            throw {
              type: "DatabaseInconsistencyError",
              message: `No existe una actividad con serverId ${remote.activity_registry_id}`,
            };
          }

          const t = new Date();
          await insertTaskRegistries(
            [
              {
                odooId: remote.id,
                userId: remote.uid,
                completedDate: remote.completed_date
                  ? parseOdoo(remote.completed_date)
                  : undefined,
                completed: remote.completed,
                observation: remote.observation,
                taskId: remote.task_id,
                activityRegistryId: activityRegistry.id,
                lastmod: t,
                lastsync: t,
              },
            ],
            tx,
          );

          continue;
        }

        assert.notNull(local.lastsync);
        if (
          local.lastmod <= local.lastsync &&
          remote.lastmod <= local.lastsync
        ) {
          continue; // all synced
        }

        if (local.lastmod > local.lastsync) {
          // TODO: For now, local wins always
          continue;
        }

        if (
          local.lastmod > (local?.lastsync ?? 0) &&
          remote.lastmod > (local?.lastsync ?? 0)
        ) {
          // TODO: Conflict resolution
          continue;
        }

        const t = new Date();
        await updateTaskRegistry(
          local.id,
          {
            odooId: remote.id,
            userId: remote.uid,
            completedDate: remote.completed_date
              ? parseOdoo(remote.completed_date)
              : undefined,
            completed: remote.completed,
            observation: remote.observation,
            taskId: remote.task_id,
            lastmod: t,
            lastsync: t,
          },
          tx,
        );
      }

      await purgeDeletedTaskRegistries(
        remoteEntities.map((i) => i.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );
}

export async function applyRemoteTaskChange(tasks: RemoteTask[]) {
  return db.transaction(
    async (tx) => {
      await upsertRemoteTasks(tasks, tx);
      await deleteNonRemoteTasks(
        tasks.map((r) => r.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );
}
