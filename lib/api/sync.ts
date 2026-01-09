import { Logger } from "@/lib/logger";
import { countPending } from "@/lib/db/queries/utils";
import { ApplicationState, globalStore } from "@/lib/store/application-state";
import { syncItinerary, syncRegistries, syncResources } from "@/lib/sync";
import { retriggerJobRegistryStatusComputation, uploadJobRegistries } from "@/lib/upload/job-registry";
import { uploadActivityRegistries } from "@/lib/upload/activity-registry";
import { uploadTaskRegistries } from "@/lib/upload/task-registry";
import {
  linkRemoteWorktimeRegistry,
  uploadWorktimeRegistry,
} from "@/lib/upload/worktime-registry";
import { uploadPhotos } from "@/lib/upload/photos";
import { okAsync } from "neverthrow";
import { isDirty } from "@/lib/sync/last-sync";
import { transformError } from "../result";

const logger = Logger.getLogger("API::SYNC");

export async function syncAll(force: boolean = false) {
  logger.verbose("Iniciando sincronización general");

  const { odooClient, sessionData, isSyncing } = globalStore.getState();

  if (odooClient == null || sessionData == null || isSyncing) {
    return;
  }

  globalStore.setState({ isSyncing: true });
  logger.verbose("Iniciando descarga de registros");

  const [resourcesDirty, itinerariesDirty, registriesDirty] = await Promise.all(
    [isDirty("resource"), isDirty("itinerary"), isDirty("registry")],
  );

  const result = await (
    force || resourcesDirty ? syncResources(odooClient, sessionData) : okAsync()
  )
    .andThen(() =>
      force || itinerariesDirty
        ? syncItinerary(odooClient, sessionData)
        : okAsync(),
    )
    .andThen(() =>
      force || registriesDirty
        ? syncRegistries(odooClient, sessionData)
        : okAsync(),
    )
    .map(() => logger.verbose("Descarga de registros exitosa"))
    .map(() => logger.verbose("Iniciando subida de registros"))
    .andThen(() => uploadJobRegistries(odooClient, sessionData.uid))
    .andThen(() => uploadActivityRegistries(odooClient, sessionData.uid))
    .andThen(() => uploadTaskRegistries(odooClient, sessionData.uid))
    .andThen(() => uploadWorktimeRegistry(odooClient, sessionData.uid))
    .andThen(() => linkRemoteWorktimeRegistry(odooClient, sessionData.uid))
    .andThen(() => retriggerJobRegistryStatusComputation(odooClient, sessionData.uid))
    .andThen(() => uploadPhotos(odooClient))
    .map(() => logger.verbose("Subida de registros exitosa"))
    .mapErr((e) => transformError(e, "Error al sincronizar datos"));

  const newState = {
    isSyncing: false,
    conflicts: 0,
    pendingChanges: await countPending(sessionData.uid).catch(() => 0),
  } as ApplicationState;

  if (result.isErr()) {
    newState.lastError = result.error;
  } else {
    newState.lastMsg = "Sincronización general exitosa";
  }

  globalStore.setState(newState);
}
