import { computeYYYYMMDD, formatDateTime } from "@/lib/date";
import db, { transBehavior } from "@/lib/db";
import { storePhotos } from "@/lib/db/actions/photos";
import {
  insertWorktimeRegistry,
  updateWorktimeRegistry,
} from "@/lib/db/actions/worktime-registry";
import { countPending } from "@/lib/db/queries/utils";
import { getCurrentWorktimeRegistryForUser } from "@/lib/db/queries/worktime-registry";
import { WorktimeRegistryInsert } from "@/lib/db/schema/worktime-registry";
import { Logger } from "@/lib/logger";
import { attemptAsync } from "@/lib/result";
import { ApplicationState, globalStore } from "@/lib/store/application-state";

const logger = Logger.getLogger("API::WORKTIME");

export async function registerWorktime(
  location: { latitude: number; longitude: number },
  observation: string | undefined = undefined,
  photos: string[],
) {
  const { sessionData } = globalStore.getState();
  if (sessionData == null) {
    return false;
  }

  const userId = sessionData.uid;
  const timeZone = sessionData.tz;
  const date = new Date();

  const { error } = await attemptAsync(async () =>
    db.transaction(
      async (tx) => {
        logger.info("Obteniendo último registro de tiempo trabajado");
        const head = await getCurrentWorktimeRegistryForUser(userId, tx).then(
          (result) => (result.length > 0 ? result[0] : undefined),
        );
        const day = computeYYYYMMDD(date, timeZone);
        const isOpen = head !== undefined && head.endDate === null;
        const newEntry = {
          userId,
          observation,
        } as WorktimeRegistryInsert;

        if (isOpen) {
          newEntry.endLat = location.latitude;
          newEntry.endLng = location.longitude;
          newEntry.endDate = date;
        } else {
          newEntry.day = day;
          newEntry.serial = (head?.serial ?? 0) + 1;
          newEntry.startLat = location.latitude;
          newEntry.startLng = location.longitude;
          newEntry.startDate = date;
        }

        logger.info("Guardando registro de tiempo trabajado", newEntry);

        let id: number = 0;
        if (isOpen) {
          id = await updateWorktimeRegistry(head.id, newEntry, false, tx);
        } else {
          id = await insertWorktimeRegistry(newEntry, false, tx);
        }

        await storePhotos(
          tx,
          photos.map((p, i) => ({
            name: `Evidencia de jornada ${i + 1}. ${formatDateTime(date)}`,
            model: "technical_support.worktime_registry",
            uri: p,
            worktimeRegistryId: id,
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
    logger.error("Error al registrar jornada", error);
    newState.lastError = error;
  } else {
    logger.info("Jornada registrada exitosamente");
  }

  globalStore.setState(newState);
  return error == null;
}
