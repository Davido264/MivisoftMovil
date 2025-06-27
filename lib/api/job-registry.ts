import db, { transBehavior } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { transformError } from "@/lib/result";
import { storePhotos } from "@/lib/db/actions/photos";
import { formatDateTime } from "@/lib/date";
import {
  insertJobRegistry,
  updateJobRegistry,
} from "@/lib/db/actions/job-registry";
import { ApplicationState, globalStore } from "@/lib/store/application-state";
import { countPending } from "@/lib/db/queries/utils";
import { JobRegistryInsert } from "@/lib/db/schema/job-registry";
import { ResultAsync } from "neverthrow";
import { addJobRegistryToWorktimeRegistry } from "@/lib/db/actions/worktime-registry";
import { getCurrentWorktimeRegistryForUser } from "@/lib/db/queries/worktime-registry";
import assert from "@/lib/assert";

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

  const jobRegistry = {
    startDate,
    userId,
    itineraryId,
    companyId,
    vehicleId,
    observation,
  } as JobRegistryInsert;

  const result = await ResultAsync.fromPromise(
    db.transaction(
      async (tx) => {
        logger.info("Actualizando registro de trabajo");
        const id = await insertJobRegistry(jobRegistry, false, tx);

        const photos = images.map((img, i) => ({
          name: `Evidencia de trabajo ${i + 1}. ${formatDateTime(startDate)}`,
          model: "technical_support.job_registry",
          jobRegistryId: id,
          uri: img,
          userId: sessionData.uid,
        }));

        logger.info("Almacenando imágenes");
        await storePhotos(photos, tx);

        logger.info("Consultando jornada actual");
        const worktimeRegistryDay = await getCurrentWorktimeRegistryForUser(
          sessionData.uid,
          tx,
        ).then((result) => {
          assert(result.length > 0, "result.length > 0");
          return result[0].day;
        });

        await addJobRegistryToWorktimeRegistry(
          worktimeRegistryDay,
          id,
          sessionData.uid,
          tx,
        );
      },
      { behavior: transBehavior },
    ),
    (e) =>
      transformError(e, "Error al iniciar el trabajo", {
        jobRegistry,
        photos: images,
      }),
  );

  const newState = {
    pendingChanges: await countPending(userId).catch(() => 0),
  } as ApplicationState;

  if (result.isErr()) {
    newState.lastError = result.error;
  } else {
    logger.info("Trabajo iniciado exitosamente");
  }

  globalStore.setState(newState);
  return result.isOk();
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

  const update = {
    endDate: date,
    score,
    observation,
  } as Partial<JobRegistryInsert>;

  const result = await ResultAsync.fromPromise(
    db.transaction(
      async (tx) => {
        logger.info("Actualizando registro de trabajo");
        await updateJobRegistry(jobRegistryId, update, false, tx);

        const signRegistry = [
          {
            name: `Firma del encargado ${formatDateTime(date)}`,
            uri: sign,
            model: "technical_support.job_registry",
            jobRegistryId: jobRegistryId,
            isSign: true,
            userId: sessionData.uid,
          },
        ];

        logger.info("Almacenando firma e imágenes");
        await storePhotos(signRegistry, tx);

        const photos = images.map((img, i) => ({
          name: `Evidencia de finalización de trabajo ${i + 1} ${formatDateTime(date)}`,
          uri: img,
          model: "technical_support.job_registry",
          jobRegistryId: jobRegistryId,
          userId: sessionData.uid,
        }));

        await storePhotos(photos, tx);

        logger.info("Consultando jornada actual");
        const worktimeRegistryDay = await getCurrentWorktimeRegistryForUser(
          sessionData.uid,
          tx,
        ).then((result) => {
          assert(result.length > 0, "result.length > 0");
          return result[0].day;
        });

        await addJobRegistryToWorktimeRegistry(
          worktimeRegistryDay,
          jobRegistryId,
          sessionData.uid,
          tx,
        );
      },
      { behavior: transBehavior },
    ),
    (e) =>
      transformError(e, "Error al finalizar el trabajo", {
        jobRegistryId,
        update,
        photos: images,
      }),
  );

  const newState = {
    pendingChanges: await countPending(userId).catch(() => 0),
  } as ApplicationState;

  if (result.isErr()) {
    newState.lastError = result.error;
  } else {
    logger.info("Trabajo finalizado exitosamente");
  }

  globalStore.setState(newState);
  return result.isOk();
}
