import * as Updates from "expo-updates";
import { transformError } from "@/lib/result";
import { globalStore } from "@/lib/store/application-state";
import { Logger } from "@/lib/logger";

const logger = Logger.getLogger("API::UPDATES");

export async function checkUpdates() {
  try {
    globalStore.setState({ isSyncing: true });
    logger.verbose("Comprobando actaulizaciones manualmente");
    const update = await Updates.checkForUpdateAsync();

    if (update.isAvailable) {
      logger.info("Actualización disponible");
    } else {
      logger.info("No hay actualizaciones disponibles");
    }

    return update.isAvailable;
  } catch (error) {
    logger.error(transformError(error, "Error al comprobar actualizaciones"));
    return false;
  } finally {
    globalStore.setState({ isSyncing: false });
  }
}

export async function updateApp() {
  try {
    globalStore.setState({ isSyncing: true });
    logger.verbose("Actualizando aplicación");
    await Updates.fetchUpdateAsync();
    globalStore.setState({ isSyncing: false });
    await Updates.reloadAsync();
  } catch (error) {
    logger.error(transformError(error, "Error al actualizar la aplicación"));
  } finally {
    globalStore.setState({ isSyncing: false });
  }
}
