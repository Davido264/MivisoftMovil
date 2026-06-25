import { Logger } from "@/lib/logger";
import { countPending, pendingBreakdown } from "@/lib/db/queries/utils";
import { globalStore } from "@/lib/store/application-state";
import { syncItinerary, syncRegistries, syncResources } from "@/lib/sync";
import { uploadRegisters } from "@/lib/upload/index";
import { uploadPhotos } from "@/lib/upload/photos";
import { isDirty } from "@/lib/sync/last-sync";
import { isNetworkError, transformError } from "../result";

const logger = Logger.getLogger("API::SYNC");

export async function syncAll(force: boolean = false) {
  logger.verbose("Iniciando sincronización general");

  const { sessionData, isSyncing } = globalStore.getState();

  if (sessionData == null || isSyncing) {
    return;
  }

  globalStore.setState({ isSyncing: true });
  logger.verbose("Iniciando descarga de registros");

  const pop = Logger.startSubStackTrace("api::syncAll");
  try {
    Logger.pushStackTrace("api::syncAll+uploadRegistries");
    await uploadRegisters(sessionData);
    logger.success("Subida de registros exitosa");
    Logger.popStackTrace();

    logger.info("Iniciando subida de fotos");
    Logger.pushStackTrace("api::syncAll+uploadPhotos");
    await uploadPhotos(sessionData);
    Logger.popStackTrace();

    Logger.pushStackTrace("api::syncAll+getDirty");
    const [resourcesDirty, itinerariesDirty, registriesDirty] =
      await Promise.all([
        isDirty("resource"),
        isDirty("itinerary"),
        isDirty("registry"),
      ]);
    Logger.popStackTrace();

    if (force || resourcesDirty) {
      Logger.pushStackTrace("api::syncAll+syncResources");
      logger.info("Sincronizando recursos");
      await syncResources(sessionData);
      Logger.popStackTrace();
    }

    if (force || itinerariesDirty) {
      Logger.pushStackTrace("api::syncAll+syncItineraries");
      logger.info("Sincronizando itinerarios");
      await syncItinerary(sessionData);
      Logger.popStackTrace();
    }

    if (force || registriesDirty) {
      Logger.pushStackTrace("api::syncAll+syncRegistries");
      logger.info("Sincronizando registros");
      await syncRegistries(sessionData);
      Logger.popStackTrace();
    }

    logger.success("Descarga de registros exitosa");

    const pendingChanges = await countPending(sessionData.uid).catch(() => 0);
    if (pendingChanges > 0) {
      logger.verbose(
        "Pendientes por tabla",
        await pendingBreakdown(sessionData.uid).catch(() => null),
      );
    }

    globalStore.setState({
      isSyncing: false,
      conflicts: 0,
      pendingChanges,
    });

    logger.success("Sincronización general exitosa");
  } catch (e) {
    if (isNetworkError(e)) {
      logger.warn("Error de red, vuelva a intentarlo más tarde");
      return;
    }
    logger.error(
      transformError(e, "Error inesperado durante la sincronización general", {
        stackTrace: Logger.stackTrace,
      }),
    );
  } finally {
    globalStore.setState({ isSyncing: false });
    pop();
  }
}
