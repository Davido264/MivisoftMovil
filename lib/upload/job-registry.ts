import {
  createJobRegistry,
  writeEndDateTime,
  writeJobRegistry,
} from "@/lib/odoo/job-registry";
import db, { transBehavior } from "@/lib/db";
import {
  prepareJobRegistryUpdatePayload,
  remotifyJobRegistry,
  updateJobRegistry,
  updateJobRegistryLastSync,
} from "@/lib/db/actions/job-registry";
import { Logger } from "@/lib/logger";
import { setSeverIdForJobRegistryImage } from "@/lib/db/actions/photos";
import {
  getPendingJobRegistryCreations,
  getAllPendingJobRegistryUpdates,
  getEndDateTimesOdooIdsAndIds,
} from "@/lib/db/queries/job-registry";
import { isNetworkError, transformError } from "@/lib/result";
import { updateWorktimeRegistryJobRegistryOdooId } from "../db/actions/worktime-registry";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatOdoo } from "../date";
import { Env } from "../odoo/env";
import { Environment } from "../odoo/_env";

const logger = Logger.getLogger("UPLOAD::JOB-REGISTRY");
const retriggersQueueKey = "job-registry::retriggers::queue";

export async function updateRemoteJobRegistries(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace("upload::uploadJobRegistries");
  logger.verbose("Actualizando registros de trabajo pendientes");
  try {
    const pending = await getAllPendingJobRegistryUpdates(userId, db);
    for (const job of pending) {
      const toUpload = prepareJobRegistryUpdatePayload(job);
      await writeJobRegistry(env, toUpload.id, toUpload);
      await enqueueRetrigger(toUpload.id);
    }

    db.transaction(
      async (tx) => {
        await updateJobRegistryLastSync(
          pending.map((p) => p.id!),
          tx,
        );
      },
      { behavior: "immediate" },
    );

    logger.verbose("Actualizando trabajos pendientes exitosa");
  } catch (e) {
    throw transformError(e, "Error al subir registros", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

export async function createRemoteJobRegistries(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace("upload::uploadJobRegistries");
  logger.verbose("Subiendo registros pendientes");

  try {
    const pending = await getPendingJobRegistryCreations(userId, db);
    const idMap = new Map<number, number>();

    for (const job of pending) {
      const toUpload = remotifyJobRegistry(job);

      let retries = 3;
      while (true) {
        try {
          const odooId = await createJobRegistry(env, toUpload);
          idMap.set(job.id, odooId);
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

    await db.transaction(async (tx) => {
      for (const [id, odooId] of idMap) {
        await updateJobRegistry(id, { odooId }, true, false, tx);
        await updateWorktimeRegistryJobRegistryOdooId(id, odooId, tx);
        await setSeverIdForJobRegistryImage(id, `${odooId}`, tx);
        await enqueueRetrigger(odooId);
      }
    });

    logger.verbose("Subida exitosa");
  } catch (e) {
    throw transformError(e, "Error al subir registros", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

export async function retriggerJobRegistryStatusComputation(
  env: Environment<Env>,
) {
  const pop = Logger.startSubStackTrace(
    "upload::retriggerJobRegistryStatusComputation",
  );
  try {
    logger.verbose("Recalculando status");
    const r = await AsyncStorage.getItem(retriggersQueueKey).then((r) =>
      r != null ? (JSON.parse(r) as number[]) : [],
    );

    const maps = await getEndDateTimesOdooIdsAndIds(r);
    for (const m of maps) {
      await updateEndDateTime(
        env,
        formatOdoo(m.endDateTime!),
        m.odooId!,
        m.localId,
      );
    }

    await AsyncStorage.setItem(retriggersQueueKey, JSON.stringify([]));
  } catch (e) {
    throw transformError(e, "No se pudo vaciar la cola", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

async function enqueueRetrigger(id: number) {
  const queue = await AsyncStorage.getItem(retriggersQueueKey).then((r) =>
    r != null ? JSON.parse(r) : [],
  );
  queue.push(id);
  await AsyncStorage.setItem(retriggersQueueKey, JSON.stringify(queue));
}

async function updateEndDateTime(
  env: Environment<Env>,
  endDateTime: string,
  odooId: number,
  localId: number,
) {
  const pop = Logger.startSubStackTrace("upload::job-registry");
  try {
    if (await writeEndDateTime(env, odooId, endDateTime)) {
      await db.transaction(
        async (tx) => {
          await updateJobRegistry(localId, {}, true, false, tx);
        },
        { behavior: transBehavior },
      );
    }
  } catch (e) {
    throw transformError(e, "Error al actualizar registro de trabajo", {
      localId,
      odooId,
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}
