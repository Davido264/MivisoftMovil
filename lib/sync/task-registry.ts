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
import { createBreather } from "@/lib/async";
import { hasLocalChanges } from "@/lib/db/actions/utils";

const logger = Logger.getLogger("task-registry");

export async function reconciliateTaskRegistries(
  remoteEntities: RemoteTaskRegistry[],
) {
  const pop = Logger.startSubStackTrace(
    "task-registry.reconciliateTaskRegistries",
  );
  try {
    logger.verbose("reconciliateTaskRegistries called", {
      count: remoteEntities.length,
    });

    // ponytail: un registro problemático (actividad inexistente, etc.) se omite
    // con warning y NO rompe toda la sincronización. Cada insert/update usa su
    // propio savepoint, así que un fallo aislado no aborta la transacción.
    const skipped: any[] = [];

    await db.transaction(
      async (tx) => {
        const breathe = createBreather();
        for (const remote of remoteEntities) {
          await breathe();
          try {
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
                skipped.push({
                  odooId: remote.id,
                  taskId: remote.task_id,
                  activityRegistryId: remote.activity_registry_id,
                  reason: "actividad local inexistente",
                });
                logger.warn("Registro de tarea omitido en reconcile", {
                  odooId: remote.id,
                  taskId: remote.task_id,
                  activityRegistryId: remote.activity_registry_id,
                  reason: "no existe la actividad local",
                });
                continue;
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

            // Cambios locales sin subir ganan: no pisar con la versión remota.
            if (hasLocalChanges(local)) continue;

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
          } catch (e: any) {
            skipped.push({
              odooId: remote.id,
              taskId: remote.task_id,
              activityRegistryId: remote.activity_registry_id,
              reason: e?.message ?? String(e),
            });
            logger.warn("Error reconciliando un registro de tarea, se omite", {
              odooId: remote.id,
              taskId: remote.task_id,
              activityRegistryId: remote.activity_registry_id,
              type: e?.type,
              error: e?.message ?? String(e),
            });
          }
        }

        await purgeDeletedTaskRegistries(
          remoteEntities.map((i) => i.id!),
          tx,
        );
      },
      { behavior: transBehavior },
    );

    if (skipped.length > 0) {
      logger.warn(
        `Reconciliación de tareas: ${skipped.length}/${remoteEntities.length} registros omitidos`,
        { skipped: skipped.slice(0, 20) },
      );
    }
  } catch (e) {
    throw transformError(e, "Error reconciliando registros de tareas", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
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
