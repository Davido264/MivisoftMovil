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
import { transformError } from "@/lib/result";
import { globalStore } from "@/lib/store/application-state";
import assert from "@/lib/assert";

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

  const pop = Logger.startSubStackTrace("worktime-registry::registerWorktime");
  try {
    await db.transaction(
      async (tx) => {
        logger.verbose("Obteniendo último registro de tiempo trabajado");
        const head = await getCurrentWorktimeRegistryForUser(userId).then(
          (result) => (result.length > 0 ? result[0] : undefined),
        );

        const [worktimeRegistry, hasToInsert] = generateCurrentWorktimeRegistry(
          date,
          timeZone,
          userId,
          head,
          location,
          observation,
        );

        logger.verbose("Guardando registro de tiempo trabajado");
        let id: number = 0;
        if (hasToInsert) {
          id = await insertWorktimeRegistry(worktimeRegistry, false, tx);
        } else {
          assert.notNull(head, "head");
          id = await updateWorktimeRegistry(
            head.id,
            worktimeRegistry,
            false,
            tx,
          );
        }

        const photoRegistries = photos.map((p, i) => ({
          name: `Evidencia de jornada ${i + 1} ${formatDateTime(date)}`,
          model: "technical_support.worktime_registry",
          uri: p,
          worktimeRegistryId: id,
          userId: sessionData.uid,
        }));

        await storePhotos(photoRegistries, tx);

        globalStore.setState({
          pendingChanges: await countPending(userId).catch(() => 0),
        });
        logger.success("Jornada registrada exitosamente");
      },
      { behavior: transBehavior },
    );

    return true;
  } catch (error) {
    logger.error(
      transformError(error, "Error al registrar jornada", {
        userId,
        date,
        location,
        observation,
        photos,
        stackTrace: Logger.stackTrace,
      }),
    );

    return false;
  } finally {
    pop();
  }
}

function generateCurrentWorktimeRegistry(
  date: Date,
  timeZone: string,
  userId: number,
  head: WorktimeRegistryInsert | undefined,
  location: { latitude: number; longitude: number },
  observation: string | undefined = undefined,
) {
  const day = computeYYYYMMDD(date, timeZone);

  if (head === undefined) {
    return [
      {
        userId,
        observation,
        day,
        serial: 1,
        startLat: location.latitude,
        startLng: location.longitude,
        startDate: date,
      } as WorktimeRegistryInsert,
      true,
    ] as [WorktimeRegistryInsert, boolean];
  }

  if (head.endDate === null) {
    return [
      {
        userId,
        observation,
        day: head.day,
        serial: head.serial,
        endLat: location.latitude,
        endLng: location.longitude,
        endDate: date,
      } as WorktimeRegistryInsert,
      false,
    ] as [WorktimeRegistryInsert, boolean];
  }

  const serial = head.day === day ? head.serial + 1 : 1;
  return [
    {
      userId,
      observation,
      day,
      serial,
      startLat: location.latitude,
      startLng: location.longitude,
      startDate: date,
    },
    true,
  ] as [WorktimeRegistryInsert, boolean];
}
