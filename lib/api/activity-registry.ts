import db, { transBehavior } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { transformError } from "@/lib/result";
import { storePhotos } from "@/lib/db/actions/photos";
import { formatDateTime } from "@/lib/date";
import { upsertActivityRegistry } from "@/lib/db/actions/activity-registry";
import { insertTaskRegistries } from "@/lib/db/actions/task-registry";
import { globalStore } from "@/lib/store/application-state";
import { countPending } from "@/lib/db/queries/utils";
import { ActivityRegistryInsert } from "@/lib/db/schema/activity-registry";
import { PhotoInsert } from "@/lib/db/schema/photos";
import { TaskRegistryInsert } from "@/lib/db/schema/task-registry";
import { getCurrentWorktimeRegistryForUser } from "@/lib/db/queries/worktime-registry";
import { getActivityTasks } from "@/lib/db/queries/resources";
import assert from "@/lib/assert";
import { addJobRegistryToWorktimeRegistry } from "@/lib/db/actions/worktime-registry";

const logger = Logger.getLogger("API::ACT-REGISTRY");

export type TaskRegistry = {
  taskId: number;
  completedDate: Date | undefined;
  observation: string;
};

export async function registerActivity(
  jobRegistryId: number,
  activityId: number,
  location: { latitude: number; longitude: number },
  observation: string,
  tasks: TaskRegistry[],
  photos: string[],
  completeAll: boolean = false,
) {
  const pop = Logger.startSubStackTrace("activity-registry::registerActivity");
  const { sessionData } = globalStore.getState();
  if (sessionData == null) {
    return false;
  }

  const userId = sessionData.uid;
  const selectedDateTime = new Date();

  const activityRegistry = {
    jobRegistryId,
    activityId,
    observation,
    lat: location.latitude,
    lng: location.longitude,
    userId: sessionData.uid,
  } as ActivityRegistryInsert;

  logger.verbose("current activity registry", activityRegistry);

  try {
    await db.transaction(
      async (tx) => {
        logger.verbose("Creando o actualizando registro de actividad");
        const id = await upsertActivityRegistry(activityRegistry, false, tx);

        const photoRegistries = photos.map(
          (img, i) =>
            ({
              name: `Evidencia de actividad ${i + 1} ${formatDateTime(selectedDateTime)}`,
              uri: img,
              model: "technical_support.activity_registry",
              isSign: false,
              activityRegistryId: id,
              userId: sessionData.uid,
            }) as PhotoInsert,
        );

        logger.verbose("Almacenando imágenes");
        await storePhotos(photoRegistries, tx);

        // Guardado directo (sin entrar a seleccionar tareas): se marca la
        // actividad como completa => todas sus tareas se registran completas.
        // upsert sobre (activityRegistryId, taskId) preserva las ya existentes
        // y conserva su observación; no duplica.
        if (completeAll) {
          const activityTasks = await getActivityTasks(activityId, id, tx);
          tasks = activityTasks.map((t) => ({
            taskId: t.id,
            completedDate: selectedDateTime,
            observation: t.observation,
          }));
        }

        if (tasks.length !== 0) {
          const taskInsert = tasks.map(
            (task) =>
              ({
                activityRegistryId: id,
                completedDate: task.completedDate,
                completed: task.completedDate !== undefined,
                taskId: task.taskId,
                userId: sessionData.uid,
                observation: task.observation,
              }) as TaskRegistryInsert,
          );

          logger.verbose("current task registries", taskInsert);

          logger.verbose("Creando registros de tareas");
          await insertTaskRegistries(taskInsert, false, tx);
        }

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
      },
      { behavior: transBehavior },
    );

    globalStore.setState({
      pendingChanges: await countPending(userId).catch(() => 0),
    });

    logger.verbose("Registro de actividad exitoso");
    return true;
  } catch (e) {
    const err = transformError(e, "Error al registrar actividad", {
      activity: activityRegistry,
      photos,
      tasks,
      stackTrace: Logger.stackTrace,
    });

    globalStore.setState({
      pendingChanges: await countPending(userId).catch(() => 0),
      lastError: err,
    });

    return false;
  } finally {
    pop();
  }
}
