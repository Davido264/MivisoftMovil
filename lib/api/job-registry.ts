import db, { transBehavior } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { ApplicationError, transformError } from "@/lib/result";
import { imageExists, storePhotos } from "@/lib/db/actions/photos";
import { formatDateTime } from "@/lib/date";
import {
  insertJobRegistry,
  updateJobRegistry,
} from "@/lib/db/actions/job-registry";
import { globalStore } from "@/lib/store/application-state";
import { countPending } from "@/lib/db/queries/utils";
import { JobRegistryInsert } from "@/lib/db/schema/job-registry";
import { addJobRegistryToWorktimeRegistry } from "@/lib/db/actions/worktime-registry";
import { getCurrentWorktimeRegistryForUser } from "@/lib/db/queries/worktime-registry";
import {
  countIncompleteActivities,
  getLatestOpenJobRegistryForUser,
} from "@/lib/db/queries/job-registry";
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

  const pop = Logger.startSubStackTrace("job-registry::registerJob");
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

  logger.verbose("current job registry", jobRegistry);

  try {
    // No se puede iniciar un nuevo registro si el usuario tiene otro sin
    // finalizar (endDate IS NULL), pendiente o fallido al cerrar.
    const open = await getLatestOpenJobRegistryForUser(userId);
    if (open.length > 0) {
      throw new ApplicationError(
        "InvalidInputError",
        "Ya tienes un registro de trabajo sin finalizar",
        { openJobId: open[0].id },
      );
    }

    await db.transaction(
      async (tx) => {
        logger.verbose("Actualizando registro de trabajo");
        const id = await insertJobRegistry(jobRegistry, false, tx);

        const photos = images.map((img, i) => ({
          name: `Evidencia de trabajo ${i + 1} ${formatDateTime(startDate)}`,
          model: "technical_support.job_registry",
          jobRegistryId: id,
          uri: img,
          userId: sessionData.uid,
        }));

        logger.verbose("Almacenando imágenes");
        await storePhotos(photos, tx);

        logger.verbose("Consultando jornada actual");
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

        globalStore.setState({
          pendingChanges: await countPending(userId, tx).catch(() => 0),
        });
      },
      { behavior: transBehavior },
    );

    logger.verbose("Trabajo iniciado exitosamente");
    return true;
  } catch (error) {
    logger.error(
      transformError(error, "Error al iniciar el trabajo", {
        jobRegistry,
        photos: images,
        stackTrace: Logger.stackTrace,
      }),
    );
    return false;
  } finally {
    pop();
  }
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

  const pop = Logger.startSubStackTrace("job-registry::finishJob");
  const userId = sessionData.uid;
  const date = new Date();

  const update = {
    endDate: date,
    score,
    observation,
  } as Partial<JobRegistryInsert>;

  try {
    // La firma es obligatoria: si no viene o el archivo ya no existe (p.ej. ruta
    // temporal borrada), no se debe finalizar el trabajo. Se valida ANTES de la
    // transacción para no dejar el registro a medias.
    if (!imageExists(sign)) {
      throw new ApplicationError(
        "InvalidInputError",
        "La firma es obligatoria para finalizar el registro",
        { jobRegistryId },
      );
    }

    // No se puede finalizar el trabajo si quedan actividades o tareas pendientes.
    const incomplete = await countIncompleteActivities(jobRegistryId);
    if (incomplete > 0) {
      throw new ApplicationError(
        "InvalidInputError",
        "No se puede finalizar: hay actividades o tareas pendientes",
        { jobRegistryId, incomplete },
      );
    }

    await db.transaction(
      async (tx) => {
        logger.verbose("Actualizando registro de trabajo");
        await updateJobRegistry(jobRegistryId, update, false, true, tx);

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

        logger.verbose("Almacenando firma e imágenes");
        await storePhotos(signRegistry, tx);

        const photos = images.map((img, i) => ({
          name: `Evidencia de finalización de trabajo ${i + 1} ${formatDateTime(date)}`,
          uri: img,
          model: "technical_support.job_registry",
          jobRegistryId: jobRegistryId,
          userId: sessionData.uid,
        }));

        await storePhotos(photos, tx);

        logger.verbose("Consultando jornada actual");
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

        globalStore.setState({
          pendingChanges: await countPending(userId, tx).catch(() => 0),
        });
      },
      { behavior: transBehavior },
    );
    logger.verbose("Trabajo finalizado exitosamente");
    return true;
  } catch (error) {
    logger.error(
      transformError(error, "Error al finalizar el trabajo", {
        jobRegistryId,
        update,
        photos: images,
        stackTrace: Logger.stackTrace,
      }),
    );
    return false;
  } finally {
    pop();
  }
}
