import db from "@/lib/db";
import { Logger } from "@/lib/logger";
import {
  createTaskRegistry,
  writeTaskRegistry,
} from "@/lib/odoo/task-registry";
import {
  prepareTaskRegistryUpdatePayload,
  remotifyTaskRegistry,
  updateTaskRegistry,
  updateTaskRegistryLastSync,
} from "@/lib/db/actions/task-registry";
import {
  getAllPendingTaskRegistries,
  getAllPendingTaskRegistryUpdates,
} from "@/lib/db/queries/task-registries";
import { getActivityRegistryOdooId } from "@/lib/db/queries/activity-registries";
import assert from "@/lib/assert";
import { isNetworkError, transformError } from "@/lib/result";
import { Env } from "../odoo/env";
import { Environment } from "../odoo/_env";
import { forEachLimit, UPLOAD_CONCURRENCY } from "./concurrent";

const logger = Logger.getLogger("UPLOAD::TASK-REGISTRY");

export async function updateRemoteTaskRegistries(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace("upload::uploadTaskRegistries");
  logger.verbose("Subiendo registros de tareas pendientes");
  try {
    const tasks = await getAllPendingTaskRegistryUpdates(userId, db);
    await forEachLimit(tasks, UPLOAD_CONCURRENCY, async (t) => {
      const toUpload = prepareTaskRegistryUpdatePayload(t);
      await writeTaskRegistry(env, toUpload.id, toUpload);
    });

    await db.transaction(
      async (tx) => {
        await updateTaskRegistryLastSync(
          tasks.map((t) => t.id!),
          tx,
        );
      },
      { behavior: "immediate" },
    );
  } catch (e) {
    throw transformError(e, "Error al subir registros", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

export async function createRemoteTaskRegistries(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace("upload::uploadTaskRegistries");
  logger.verbose("Subiendo registros pendientes");

  const idMap = new Map<number, number>();
  try {
    const tasks = await getAllPendingTaskRegistries(userId, db);

    await forEachLimit(tasks, UPLOAD_CONCURRENCY, async (t) => {
      const toUpload = remotifyTaskRegistry(t);
      const aOdooId = await getActivityRegistryOdooId(toUpload.activity_registry_id, db);
      assert.notNull(aOdooId);
      toUpload.activity_registry_id = aOdooId;

      let retries = 3;
      while (true) {
        try {
          const odooId = await createTaskRegistry(env, toUpload);
          idMap.set(t.id, odooId);
          break;
        } catch (e) {
          if (isNetworkError(e)) {
            logger.verbose("Error al subir registro, reintentando");
            --retries;
          }
          if (retries <= 0 || !isNetworkError(e)) {
            throw transformError(e, "Error al subir registros", {
              stackTrace: Logger.stackTrace,
            });
          }
        }
      }
    });
    Logger.popStackTrace();

    await db.transaction(async (tx) => {
      for (const [id, odooId] of idMap) {
        await updateTaskRegistry(id, { odooId }, true, tx);
      }
    });
    Logger.popStackTrace();

    logger.verbose("Subida exitosa");
  } catch (e) {
    throw transformError(e, "Error al subir registros", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

export async function uploadTaskRegistries(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace("upload::uploadTaskRegistries");
  logger.verbose("Subiendo registros pendientes");

  try {
    Logger.pushStackTrace("upload::uploadTaskRegistries+retrieve");
    const tasks = await getAllPendingTaskRegistries(userId, db);
    Logger.popStackTrace();

    Logger.pushStackTrace("upload::uploadTaskRegistries+upload");
    const idMap = new Map<number, number>();
    for (const t of tasks) {
      const toUpload = remotifyTaskRegistry(t);

      let retries = 3;
      while (true) {
        try {
          const odooId = await createTaskRegistry(env, toUpload);
          idMap.set(t.id, odooId);
          break;
        } catch (e) {
          if (isNetworkError(e)) {
            logger.verbose("Error al subir registro, reintentando");
            --retries;
          }
          if (retries <= 0 || !isNetworkError(e)) {
            throw transformError(e, "Error al subir registros", {
              stackTrace: Logger.stackTrace,
            });
          }
        }
      }
    }
    Logger.popStackTrace();

    Logger.pushStackTrace("upload::uploadTaskRegistries+update-sync-state");
    await db.transaction(async (tx) => {
      for (const [id, odooId] of idMap) {
        await updateTaskRegistry(id, { odooId }, true, tx);
      }
    });
    Logger.popStackTrace();

    logger.verbose("Subida exitosa");
  } catch (e) {
    throw transformError(e, "Error al subir registros", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}
