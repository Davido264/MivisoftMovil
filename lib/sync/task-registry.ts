import db, { transBehavior } from "@/lib/db";
import assert from "@/lib/assert";
import { RemoteTask, RemoteTaskRegistry } from "@/lib/odoo/task-registry";
import { parseOdoo } from "@/lib/date";
import {
  getLocalTaskRegistryFromOdooId,
  getTaskRegistryForActivityRegistryAndTask,
} from "@/lib/db/queries/task-registries";
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
import { transformError } from "@/lib/result";
import { Logger } from "@/lib/logger";

export async function reconciliateTaskRegistries(
  remoteEntities: RemoteTaskRegistry[],
) {
  try {
    Logger.pushStackTrace("task-registry.reconciliateTaskRegistries");
    await db.transaction(
      async (tx) => {
        for (const remote of remoteEntities) {
          assert.notNull(remote.id, "remote.id");

          let local = await getLocalTaskRegistryFromOdooId(remote.id, tx);

          if (local === undefined) {
            assert.notNull(
              remote.activity_registry_id,
              "remote.activity_registry_id",
            );
            const activityRegistry = await getLocalActivityFromRegistryOdooId(
              remote.activity_registry_id,
              tx,
            );

            if (activityRegistry === undefined) {
              throw {
                type: "DatabaseInconsistencyError",
                message: `No existe una actividad con server Id ${remote.activity_registry_id}`,
              };
            }

            const task = await getTaskRegistryForActivityRegistryAndTask(
              activityRegistry.id,
              remote.task_id,
            );

            if (task === undefined) {
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
                  },
                ],
                true,
                tx,
              );
              continue;
            }

            local = task;
          }

          // local.lastsync ??= new Date();
          // if (
          //   local.lastmod <= local.lastsync &&
          //   remote.lastmod <= local.lastsync
          // ) {
          //   continue; // all synced
          // }

          // if (local.lastmod > local.lastsync) {
          //   // TODO: For now, local wins always
          //   continue;
          // }

          // if (
          //   local.lastmod > local.lastsync &&
          //   remote.lastmod > local.lastsync
          // ) {
          //   // TODO: Conflict resolution
          //   continue;
          // }

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
            },
            true,
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
  } catch (e) {
    throw transformError(e, "Error reconciliando registros de tareas", {
      stackTrace: Logger.stackTrace,
    });
  }
}

export async function applyRemoteTaskChange(tasks: RemoteTask[]) {
  try {
    Logger.pushStackTrace("task-registry.applyRemoteTaskChange");
    await db.transaction(
      async (tx) => {
        await upsertRemoteTasks(tasks, tx);
        await deleteNonRemoteTasks(
          tasks.map((r) => r.id!),
          tx,
        );
      },
      { behavior: transBehavior },
    );
  } catch (e) {
    throw transformError(e, "Error aplicando cambios remotos de tareas", {
      stackTrace: Logger.stackTrace,
    });
  }
}
