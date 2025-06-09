import db, { transBehavior } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { attemptAsync } from "@/lib/result";
import { storePhotos } from "@/lib/db/actions/photos";
import { formatDateTime } from "@/lib/date";
import { upsertActivityRegistry } from "@/lib/db/actions/activity-registry";
import { insertTaskRegistries } from "@/lib/db/actions/task-registry";
import { ApplicationState, globalStore } from "@/lib/store/application-state";
import { countPending } from "@/lib/db/queries/utils";

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
) {
  const { sessionData } = globalStore.getState();
  if (sessionData == null) {
    return false;
  }

  const userId = sessionData.uid;
  const selectedDateTime = new Date();

  const { error } = await attemptAsync(async () =>
    db.transaction(
      async (tx) => {
        logger.info("Creando o actualizando registro de actividad");
        const id = await upsertActivityRegistry(
          {
            jobRegistryId,
            activityId,
            observation,
            lat: location.latitude,
            lng: location.longitude,
            userId: sessionData.uid,
          },
          false,
          tx,
        );

        logger.info("Almacenando imágenes");
        await storePhotos(
          tx,
          photos.map((img, i) => ({
            name: `Evidencia de actividad ${i + 1} ${formatDateTime(selectedDateTime)}`,
            uri: img,
            model: "technical_support.activity_registry",
            isSign: false,
            activityRegistryId: id,
            userId: sessionData.uid,
          })),
        );

        if (tasks.length === 0) {
          return;
        }

        logger.info("Creando registros de tareas");
        await insertTaskRegistries(
          tasks.map((task) => ({
            activityRegistryId: id,
            completedDate: task.completedDate,
            completed: task.completedDate !== undefined,
            taskId: task.taskId,
            userId: sessionData.uid,
            observation: task.observation,
          })),
          false,
          tx,
        );
      },
      { behavior: transBehavior },
    ),
  );

  const newState = {
    pendingChanges: await countPending(userId).catch(() => 0),
  } as ApplicationState;

  if (error != null) {
    logger.error("Error al registrar actividad", error);
    newState.lastError = error;
  } else {
    logger.info("Registro de actividad exitoso");
  }

  globalStore.setState(newState);
  return error == null;
}
