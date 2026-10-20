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
    // El rerun existe solo para subir registros creados DURANTE el sync; la
    // descarga/reconciliación ya corrió en la primera pasada y es la parte cara.
    // Por eso el rerun es solo-subida (uploadOnly): mantiene la garantía de no
    // perder registros sin repetir el trabajo pesado.
    while (rerun) {
      rerun = false;
      await runSyncAll(false, true);
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runSyncAll(
  force: boolean,
  uploadOnly: boolean = false,
): Promise<void> {
  logger.verbose("Iniciando sincronización general");

  const { sessionData } = globalStore.getState();

  if (sessionData == null) {
    return;
  }

  globalStore.setState({ isSyncing: true });
  logger.verbose("Iniciando descarga de registros");

  // ponytail: medición temporal para localizar el cuello de botella del sync.
  // El Logger no cronometra las etapas, así que envolvemos cada fase con Date.now.
  // Quitar cuando ya sepamos qué etapa se come los minutos.
  const t0 = Date.now();
  const timed = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      logger.verbose(`⏱ ${label}: ${((Date.now() - start) / 1000).toFixed(1)}s`);
    }
  };

  const pop = Logger.startSubStackTrace("api::syncAll");
  try {
    Logger.pushStackTrace("api::syncAll+uploadRegistries");
    await timed(`uploadRegisters${uploadOnly ? " (rerun)" : ""}`, () =>
      uploadRegisters(sessionData),
    );
    logger.success("Subida de registros exitosa");
    Logger.popStackTrace();

    logger.info("Iniciando subida de fotos");
    Logger.pushStackTrace("api::syncAll+uploadPhotos");
    await timed(`uploadPhotos${uploadOnly ? " (rerun)" : ""}`, () =>
      uploadPhotos(sessionData),
    );
    Logger.popStackTrace();

    // El rerun (uploadOnly) solo sube lo creado durante el sync; la descarga ya
    // se hizo en la primera pasada, así que se salta la parte cara.
    if (!uploadOnly) {
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
        await timed("syncResources", () => syncResources(sessionData));
        Logger.popStackTrace();
      }

      if (force || itinerariesDirty) {
        Logger.pushStackTrace("api::syncAll+syncItineraries");
        logger.info("Sincronizando itinerarios");
        await timed("syncItinerary", () => syncItinerary(sessionData));
        Logger.popStackTrace();
      }

      if (force || registriesDirty) {
        Logger.pushStackTrace("api::syncAll+syncRegistries");
        logger.info("Sincronizando registros");
        await timed("syncRegistries", () => syncRegistries(sessionData, force));
        Logger.popStackTrace();
      }

      logger.success("Descarga de registros exitosa");
    }

    logger.verbose(
      `⏱ TOTAL pasada${uploadOnly ? " (rerun)" : ""}: ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );

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
