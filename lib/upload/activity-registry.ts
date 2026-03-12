import db from "@/lib/db";
import { Logger } from "@/lib/logger";
import { setServerIdForActivityRegistryImage } from "@/lib/db/actions/photos";
import {
  createActivityRegistry,
  writeActivityRegistry,
} from "@/lib/odoo/act-registry";
import {
  prepareActivityRegistryUpdatePayload,
  remotifyActivityRegistry,
  updateActivityRegistry,
  updateActivityRegistryLastSync,
} from "@/lib/db/actions/activity-registry";
import {
  getAllNewActivityRegistries,
  getAllPendingActivityRegistryUpdates,
} from "@/lib/db/queries/activity-registries";
import { getJobRegistryOdooId } from "@/lib/db/queries/job-registry";
import assert from "@/lib/assert";
import { isNetworkError, transformError } from "../result";
import { Env } from "../odoo/env";
import { Environment } from "../odoo/_env";

const logger = Logger.getLogger("UPLOAD::ACTIVITY-REGISTRY");

export async function updateRemoteActivityRegistries(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace(
    "upload::updateRemoteActivityRegistries",
  );
  logger.verbose("Actualizando registros de actividad modificados");
  try {
    const acts = await getAllPendingActivityRegistryUpdates(userId, db);
    // TODO: we can parallelize some of this requests
    for (const act of acts) {
      const toUpload = prepareActivityRegistryUpdatePayload(act);
      await writeActivityRegistry(env, toUpload.id, toUpload);
    }

    db.transaction(
      async (tx) => {
        await updateActivityRegistryLastSync(
          acts.map((a) => a.id!),
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

export async function createRemoteActivityRegistries(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace("upload::uploadActivityRegistries");
  logger.verbose("Subiendo registros de actividad pendientes");

  const idMap = new Map<number, number>();
  try {
    Logger.pushStackTrace("upload::uploadActivityRegistries+retrieve");
    const acts = await getAllNewActivityRegistries(userId, db);
    Logger.popStackTrace();

    Logger.pushStackTrace("upload::uploadActivityRegistries+upload");
    for (const act of acts) {
      const toUpload = remotifyActivityRegistry(act);

      const jOdooId = await getJobRegistryOdooId(toUpload.job_registry_id);
      assert.notNull(jOdooId);
      toUpload.job_registry_id = jOdooId;

      let retries = 3;
      while (true) {
        try {
          const odooId = await createActivityRegistry(env, toUpload);
          idMap.set(act.id, odooId);
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

    Logger.pushStackTrace("upload::uploadActivityRegistries+update-sync-state");
    await db.transaction(async (tx) => {
      for (const [id, odooId] of idMap) {
        await updateActivityRegistry(id, { odooId }, true, tx);
        await setServerIdForActivityRegistryImage(id, `${odooId}`, tx);
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
