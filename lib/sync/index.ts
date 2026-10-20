import {
  applyRemoteCompanyChange,
  applyRemoteItineraryChange,
  applyRemoteUsersChange,
  applyRemoteVehicleChange,
} from "@/lib/sync/resources";
import {
  fetchCompanies,
  fetchItineraries,
  fetchVehicles,
} from "@/lib/odoo/itinerary-company-vehicles";
import { fetchUsers } from "@/lib/odoo/users";
import {
  fetchActivities,
  fetchActivityRegistries,
} from "@/lib/odoo/act-registry";
import { odoo, RemoteActivity, RemoteItinerary } from "@/lib/odoo/env";
import {
  fetchTaskRegistries,
  fetchTaskRegistryIds,
  fetchTasks,
} from "@/lib/odoo/task-registry";
import { fetchJobRegistries } from "@/lib/odoo/job-registry";
import { reconciliateJobRegistries } from "@/lib/sync/job-registry";
import {
  reconciliateActivityRegistries,
  applyRemoteActivityChange,
} from "@/lib/sync/activity-registry";
import {
  reconciliateTaskRegistries,
  applyRemoteTaskChange,
} from "@/lib/sync/task-registry";
import { formatDateTime, normalizedDate } from "@/lib/date";
import { fetchLatestWorktimeRegistry } from "@/lib/odoo/worktime-registry";
import { reconciliate as reconliciateWorktimeRegistries } from "@/lib/sync/worktime-registry";
import { OdooSession } from "@/lib/db/schema/user-session";
import { getLastSyncDate, updateLastSync } from "@/lib/sync/last-sync";
import { Logger } from "@/lib/logger";

const logger = Logger.getLogger("API::SYNC");

// ponytail: medición temporal para localizar el cuello de botella de
// syncRegistries (fetch vs cada reconciliación). Quitar cuando ya sepamos.
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    logger.verbose(`⏱ ${label}: ${((Date.now() - start) / 1000).toFixed(1)}s`);
  }
}

const MAX_REGISTRY_AGE = 60 * 24 * 3600 * 1000; // two months

// Margen de solape para el fetch incremental de tareas: reprocesa ~15 min
// extra por si el reloj del dispositivo va adelantado respecto al servidor
// (write_date es hora de servidor). Reprocesar un poco es idempotente y barato;
// perder un cambio no lo es.
const INCREMENTAL_MARGIN_MS = 15 * 60 * 1000;

export async function syncRegistries(
  sessionData: OdooSession,
  // force = sync manual: ignora el incremental y reconcilia TODO (válvula de
  // reparación si el incremental alguna vez se desincroniza).
  force: boolean = false,
) {
  const pop = Logger.startSubStackTrace("sync::syncRegistries");

  try {
    Logger.pushStackTrace("sync::syncRegistries+connect");
    const { env } = await odoo.connect({ sessionId: sessionData.sid });
    const maxAge = normalizedDate(
      new Date(Date.now() - MAX_REGISTRY_AGE),
      "hours",
    );
    Logger.popStackTrace();

    // Fetch incremental de tareas: solo las modificadas desde el último sync.
    // null (primer sync) o force => full. Las tareas son la tabla hoja y la más
    // grande (miles), así que acá está el grueso del costo de reconciliación.
    const lastSync = force ? null : await getLastSyncDate("registry");
    const tasksSince = lastSync
      ? new Date(lastSync.getTime() - INCREMENTAL_MARGIN_MS)
      : undefined;

    logger.verbose(
      `Iniciando sincronización de registros desde ${formatDateTime(maxAge)}` +
        (tasksSince
          ? ` (tareas incrementales desde ${formatDateTime(tasksSince)})`
          : " (tareas: full)"),
    );

    Logger.pushStackTrace("sync::syncRegistries+fetch");
    const [j, w] = await timed("fetch jobs+worktime", () =>
      Promise.all([
        fetchJobRegistries(env, maxAge),
        fetchLatestWorktimeRegistry(env, sessionData.uid, sessionData.tz),
      ]),
    );

    const a = await timed("fetch activities", () =>
      fetchActivityRegistries(env, j),
    );
    // Cambiadas (para reconciliar) + set completo de IDs (para el purge).
    const t = await timed("fetch tasks (changed)", () =>
      fetchTaskRegistries(env, a, tasksSince),
    );
    const taskIds = await timed("fetch task ids (purge)", () =>
      fetchTaskRegistryIds(env, a),
    );
    Logger.popStackTrace();

    logger.info(
      `Conteos: jobs=${j.length}, activities=${a.length}, tasks cambiadas=${t.length}/${taskIds.length}`,
    );

    Logger.pushStackTrace("sync::syncRegistries+store");
    await timed("reconcile worktime", () => reconliciateWorktimeRegistries(w));
    await timed(`reconcile jobs (${j.length})`, () =>
      reconciliateJobRegistries(j),
    );
    await timed(`reconcile activities (${a.length})`, () =>
      reconciliateActivityRegistries(a),
    );
    await timed(`reconcile tasks (${t.length}/${taskIds.length})`, () =>
      reconciliateTaskRegistries(t, taskIds),
    );
    await updateLastSync("registry");
    Logger.popStackTrace();

    logger.verbose("Sincronización de registros exitosa");
  } finally {
    pop();
  }
}

export async function syncResources(sessionData: OdooSession) {
  const pop = Logger.startSubStackTrace("sync::syncResources");

  try {
    Logger.pushStackTrace("sync::syncResources+connect");
    const { env } = await odoo.connect({ sessionId: sessionData.sid });
    logger.verbose("Iniciando Sincronización de recursos");
    Logger.popStackTrace();

    Logger.pushStackTrace("sync::syncResources+fetch");
    const [v, c, u] = await Promise.all([
      fetchVehicles(env),
      fetchCompanies(env),
      fetchUsers(env),
    ]);
    Logger.popStackTrace();

    Logger.pushStackTrace("sync::syncResources+store");
    await applyRemoteCompanyChange(c);
    await applyRemoteVehicleChange(v);
    await applyRemoteUsersChange(u);
    await updateLastSync("resource");
    Logger.popStackTrace();

    logger.verbose("Sincronización de recursos exitosa");
  } finally {
    pop();
  }
}

export async function syncItinerary(sessionData: OdooSession) {
  const pop = Logger.startSubStackTrace("sync::syncItinerary");

  try {
    Logger.pushStackTrace("sync::syncItinerary+connect");
    const { env } = await odoo.connect({ sessionId: sessionData.sid });
    logger.verbose("Iniciando Sincronización de itinerarios");
    Logger.popStackTrace();

    Logger.pushStackTrace("sync::syncItinerary+fetch");
    const itineraries = await fetchItineraries(env);
    const a = await fetchActivities(env, itineraryIds(itineraries));
    const t = await fetchTasks(env, activityIds(a));
    Logger.popStackTrace();

    Logger.pushStackTrace("sync::syncItinerary+store");
    await applyRemoteActivityChange(a);
    await applyRemoteItineraryChange(itineraries);
    await applyRemoteTaskChange(t);
    await updateLastSync("itinerary");
    Logger.popStackTrace();

    logger.verbose("Sincronización de itinerarios exitosa");
  } finally {
    pop();
  }
}

function itineraryIds(itineraries: RemoteItinerary[]) {
  return itineraries.map((i) => i.id!);
}

function activityIds(activities: RemoteActivity[]) {
  return activities.map((i) => i.id!);
}
