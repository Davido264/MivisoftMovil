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
import { fetchTaskRegistries, fetchTasks } from "@/lib/odoo/task-registry";
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
import { updateLastSync } from "@/lib/sync/last-sync";
import { Logger } from "@/lib/logger";

const logger = Logger.getLogger("API::SYNC");

const MAX_REGISTRY_AGE = 30 * 24 * 3600 * 1000; // one month

export async function syncRegistries(sessionData: OdooSession) {
  const pop = Logger.startSubStackTrace("sync::syncRegistries");

  try {
    Logger.pushStackTrace("sync::syncRegistries+connect");
    const { env } = await odoo.connect({ sessionId: sessionData.sid });
    const maxAge = normalizedDate(
      new Date(Date.now() - MAX_REGISTRY_AGE),
      "hours",
    );
    Logger.popStackTrace();

    logger.verbose(
      `Iniciando sincronización de registros desde ${formatDateTime(maxAge)}`,
    );

    Logger.pushStackTrace("sync::syncRegistries+fetch");
    const [j, w] = await Promise.all([
      fetchJobRegistries(env, maxAge),
      fetchLatestWorktimeRegistry(env, sessionData.uid, sessionData.tz),
    ]);

    const a = await fetchActivityRegistries(env, j);
    const t = await fetchTaskRegistries(env, a);
    Logger.popStackTrace();

    Logger.pushStackTrace("sync::syncRegistries+store");
    await reconliciateWorktimeRegistries(w);
    await reconciliateJobRegistries(j);
    await reconciliateActivityRegistries(a);
    await reconciliateTaskRegistries(t);
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
