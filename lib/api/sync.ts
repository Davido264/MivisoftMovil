import { Logger } from "@/lib/logger";
import { countPending, pendingBreakdown } from "@/lib/db/queries/utils";
import { globalStore } from "@/lib/store/application-state";
import { syncItinerary, syncRegistries, syncResources } from "@/lib/sync";
import { uploadRegisters } from "@/lib/upload/index";
import { uploadPhotos } from "@/lib/upload/photos";
import { isDirty } from "@/lib/sync/last-sync";
import { isNetworkError, transformError } from "../result";

const logger = Logger.getLogger("API::SYNC");

// ponytail: mutex real e independiente del flag de UI isSyncing, que también
// mueven checkUpdates/updateApp; usarlo como lock dejaba pasar syncs paralelos.
// Los disparos concurrentes reutilizan la sincronización en curso (coalesce) en
// vez de encolar otra, así cada acción no dispara varias sincronizaciones.
let inFlight: Promise<void> | null = null;
// ponytail: si llega una petición MIENTRAS otro sync corre, ese sync ya leyó sus
// pendientes ANTES, así que no subiría lo recién creado. Antes se descartaba la
// petición y los cambios quedaban sin subir hasta recargar la app. Ahora se marca
// una pasada extra al terminar: un registro creado durante el sync se sube solo.
let rerun = false;

export function syncAll(force: boolean = false): Promise<void> {
  if (inFlight) {
    rerun = true;
    return inFlight;
  }
  inFlight = (async () => {
    await runSyncAll(force);
    while (rerun) {
      rerun = false;
      await runSyncAll(false);
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSyncAll(force: boolean): Promise<void> {
  logger.verbose("Iniciando sincronización general");

  const { sessionData } = globalStore.getState();

  if (sessionData == null) {
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
    const err = transformError(
      e,
      "Error inesperado durante la sincronización general",
      { stackTrace: Logger.stackTrace },
    );
    // El sync es reintentable: los cambios quedan guardados localmente (dirty) y
    // el próximo sync los vuelve a subir desde donde se quedó. Un fallo del sync
    // AUTOMÁTICO de fondo (force=false), típicamente por una escritura del
    // usuario concurrente, NO debe alarmar con un toast de error — se registra y
    // se reintenta solo. Solo el sync manual/forzado (force=true) muestra el error.
    if (force) {
      logger.error(err);
    } else {
      logger.warn(
        "Sincronización en segundo plano falló, se reintentará en el próximo sync",
        err,
      );
    }
  } finally {
    globalStore.setState({ isSyncing: false });
    pop();
  }
}
