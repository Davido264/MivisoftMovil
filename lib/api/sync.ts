import { Logger } from "@/lib/logger";
import { countPending } from "@/lib/db/queries/utils";
import { ApplicationState, globalStore } from "@/lib/store/application-state";
import { attemptAsync } from "@/lib/result";
import { syncItinerary, syncRegistries, syncResources } from "@/lib/sync";
import { uploadJobRegistries } from "@/lib/upload/job-registry";
import { uploadActivityRegistries } from "@/lib/upload/activity-registry";
import { uploadTaskRegistries } from "../upload/task-registry";
import { uploadWorktimeRegistry } from "../upload/worktime-registry";
import { uploadPhotos } from "../upload/photos";

const logger = Logger.getLogger("API::SYNC");

export async function syncAll(force: boolean = false) {
  logger.info("Iniciando sincronización general");

  const { odooClient, sessionData, isSyncing } = globalStore.getState();

  if (odooClient == null || sessionData == null || isSyncing) {
    return;
  }

  globalStore.setState({ isSyncing: true });
  const { error } = await attemptAsync(async () => {
    logger.info("Iniciando descarga de registros");
    await syncResources(force, odooClient, sessionData);
    await syncItinerary(force, odooClient, sessionData);
    await syncRegistries(force, odooClient, sessionData);
    logger.info("Descarga de registros exitosa");

    logger.info("Iniciando subida de registros");
    await uploadJobRegistries(odooClient, sessionData.uid);
    await uploadActivityRegistries(odooClient, sessionData.uid);
    await uploadTaskRegistries(odooClient, sessionData.uid);
    await uploadWorktimeRegistry(odooClient, sessionData.uid);
    await uploadPhotos(odooClient);
    logger.info("Subida de registros exitosa");
  });

  const newState = {
    isSyncing: false,
    conflicts: 0,
    pendingChanges: await countPending(sessionData.uid).catch(() => 0),
  } as ApplicationState;

  if (error != null) {
    logger.error("Error al sincronizar datos", error);
    newState.lastError = error;
  } else {
    logger.info("Sincronización general exitosa");
    newState.lastMsg = "Sincronización general exitosa";
  }

  globalStore.setState(newState);
}
