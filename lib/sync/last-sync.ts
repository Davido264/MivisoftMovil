import AsyncStorage from "@react-native-async-storage/async-storage";
import { Logger } from "@/lib/logger";
import { transformError } from "@/lib/result";
import { ResultAsync } from "neverthrow";

const logger = Logger.getLogger("SYNC::STATUS");

const cacheKeys = {
  itinerary: "sync::last_sync_itinerary",
  resource: "sync::last_sync_res",
  registry: "sync::last_sync_reg",
};

const cacheExpiration = {
  itinerary: 1000 * 60 * 5, // 5 minutes
  resource: 1000 * 60 * 15, // 15 minutes
  registry: 1000 * 60 * 3, // 3 minutes
};

export type CacheKey = keyof typeof cacheKeys;

export async function isDirty(key: CacheKey) {
  const lastSyncKey = cacheKeys[key];
  const frecuencyms = cacheExpiration[key];
  const lastSync = await getLastSync(lastSyncKey);

  return lastSync == null || Date.now() - lastSync.getTime() > frecuencyms;
}

function getLastSync(lastSyncKey: string) {
  return ResultAsync.fromPromise(AsyncStorage.getItem(lastSyncKey), (e) => {
    logger.warn(
      "No se pudo obtener la fecha de última actualización, se asumirá que no se sincronizó",
      transformError(e, "Error al obtener última actualización"),
    );
  })
    .map((d) => (d != null ? new Date(d) : null))
    .unwrapOr(null);
}

export function updateLastSync(key: CacheKey) {
  return ResultAsync.fromPromise(
    AsyncStorage.setItem(cacheKeys[key], new Date().toISOString()),
    (e) => {
      logger.warn(
        "No se pudo almacenar la nueva fecha de última actualización, futuras sincronizaciónes no usarán este valor",
        transformError(e, "Error al almacenar última actualización"),
      );
    },
  ).unwrapOr(undefined);
}
