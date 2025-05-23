import AsyncStorage from "@react-native-async-storage/async-storage";
import { Logger } from "@/lib/logger";
import { transformError } from "@/lib/result";

const logger = Logger.getLogger("SYNC::STATUS");

export async function needsSync(
  lastSyncKey: string,
  frecuencyms: number,
  force: boolean,
) {
  if (!force) {
    const lastSync = await getLastSync(lastSyncKey);
    if (lastSync != null && Date.now() - lastSync.getTime() < frecuencyms) {
      return false;
    }
  }
  return true;
}

async function getLastSync(lastSyncKey: string) {
  let lastSync = null;
  try {
    lastSync = await AsyncStorage.getItem(lastSyncKey);
  } catch (e) {
    logger.warn(
      "No se pudo obtener la fecha de última actualización, se asumirá que no se sincronizó",
      transformError(e),
    );
    lastSync = null;
  }

  if (lastSync != null) {
    return new Date(lastSync);
  }
  return undefined;
}

export async function updateLastSync(lastSyncKey: string) {
  try {
    await AsyncStorage.setItem(lastSyncKey, new Date().toISOString());
  } catch (e) {
    logger.warn(
      "No se pudo almacenar la nueva fecha de última actualización, futuras sincronizaciónes no usarán este valor",
      transformError(e),
    );
  }
}
