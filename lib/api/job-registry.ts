import db, { transBehavior } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { attemptAsync } from "@/lib/result";
import { storePhotos } from "@/lib/db/actions/photos";
import { formatDateTime } from "@/lib/date";
import {
  insertJobRegistry,
  updateJobRegistry,
} from "@/lib/db/actions/job-registry";
import { ApplicationState, globalStore } from "@/lib/store/application-state";
import { countPending } from "@/lib/db/queries/utils";

const logger = Logger.getLogger("API::JOB-REGISTRY");

export async function startJob(
  observation: string,
  itineraryId: number,
  companyId: number,
  vehicleId: number,
  images: string[],
) {
  const { sessionData } = globalStore.getState();
  if (sessionData == null) {
    return false;
  }

  const userId = sessionData.uid;
  const startDate = new Date();

  const { error } = await attemptAsync(async () =>
    db.transaction(
      async (tx) => {
        logger.info("Actualizando registro de trabajo");
        const id = await insertJobRegistry(
          {
            startDate,
            userId,
            itineraryId,
            companyId,
            vehicleId,
            observation,
          },
          false,
          tx,
        );

        logger.info("Almacenando imágenes");
        await storePhotos(
          tx,
          images.map((img, i) => ({
            name: `Evidencia de trabajo ${i + 1}. ${formatDateTime(startDate)}`,
            model: "technical_support.job_registry",
            jobRegistryId: id,
            uri: img,
            userId: sessionData.uid,
          })),
        );
      },
      { behavior: transBehavior },
    ),
  );

  const newState = {
    pendingChanges: await countPending(userId).catch(() => 0),
  } as ApplicationState;

  if (error != null) {
    logger.error("Error al iniciar el trabajo", error);
    newState.lastError = error;
  } else {
    logger.info("Trabajo iniciado exitosamente");
  }

  globalStore.setState(newState);
  return error == null;
}

export async function finishJob(
  jobRegistryId: number,
  observation: string,
  score: number,
  sign: string,
  images: string[],
) {
  const { sessionData } = globalStore.getState();
  if (sessionData == null) {
    return false;
  }

  const userId = sessionData.uid;
  const date = new Date();

  const { error } = await attemptAsync(async () =>
    db.transaction(
      async (tx) => {
        const update = {
          endDate: date,
          score,
          observation,
        };
        logger.info("Actualizando registro de trabajo");
        await updateJobRegistry(jobRegistryId, update, false, tx);

        logger.info("Almacenando firma e imágenes");
        await storePhotos(tx, [
          {
            name: `Firma del encargado ${formatDateTime(date)}`,
            uri: sign,
            model: "technical_support.job_registry",
            jobRegistryId: jobRegistryId,
            isSign: true,
            userId: sessionData.uid,
          },
        ]);

        await storePhotos(
          tx,
          images.map((img, i) => ({
            name: `Evidencia de finalización de trabajo ${i + 1} ${formatDateTime(date)}`,
            uri: img,
            model: "technical_support.job_registry",
            jobRegistryId: jobRegistryId,
            userId: sessionData.uid,
          })),
        );
      },
      { behavior: transBehavior },
    ),
  );

  const newState = {
    pendingChanges: await countPending(userId).catch(() => 0),
  } as ApplicationState;

  if (error != null) {
    logger.error("Error al finalizar el trabajo", error);
    newState.lastError = error;
  } else {
    logger.info("Trabajo finalizado exitosamente");
  }

  globalStore.setState(newState);
  return error == null;
}
