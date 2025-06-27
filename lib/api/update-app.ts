import * as Updates from "expo-updates";
import { transformError } from "@/lib/result";
import { globalStore } from "@/lib/store/application-state";
import { Logger } from "@/lib/logger";
import { ResultAsync } from "neverthrow";

const logger = Logger.getLogger("API::UPDATES");

export async function checkUpdates() {
  globalStore.setState({ isSyncing: true });
  const result = await ResultAsync.fromThrowable(
    async () => {
      logger.info("Comprobando actaulizaciones manualmente");
      const update = await Updates.checkForUpdateAsync();

      const lastMsg = update.isAvailable
        ? "Actualización disponible"
        : "Aplicación actualizada";
      globalStore.setState({ lastMsg });
      return update.isAvailable;
    },
    (e) => transformError(e, "Error al comprobar actualizaciones"),
  )();

  globalStore.setState({ isSyncing: false });
  if (result.isErr()) {
    globalStore.setState({ lastError: result.error });
    return false;
  }
  return result.value;
}

export async function updateApp() {
  globalStore.setState({ isSyncing: true });
  const result = await ResultAsync.fromThrowable(
    async () => {
      logger.info("Actualizando aplicación");
      await Updates.fetchUpdateAsync();
      globalStore.setState({ isSyncing: false });
      await Updates.reloadAsync();
    },
    (e) => transformError(e, "Error al actualizar la aplicación"),
  )();

  globalStore.setState({ isSyncing: false });
  if (result.isErr()) {
    globalStore.setState({ lastError: result.error });
  }
}
