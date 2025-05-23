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
import { fetchWorktimeRegistry } from "@/lib/odoo/worktime-registry";
import { reconciliate as reconliciateWorktimeRegistries } from "@/lib/sync/worktime-registry";
import { OdooSession } from "@/lib/db/schema/user-session";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { needsSync, updateLastSync } from "@/lib/sync/last-sync";
import { Logger } from "@/lib/logger";

const logger = Logger.getLogger("API::SYNC");

const MAX_REGISTRY_AGE = 30 * 24 * 3600 * 1000; // one month

export async function syncRegistries(
  force: boolean = false,
  odooClient: OdooJSONRpc,
  sessionData: OdooSession,
) {
  const key = "sync::last_sync_res";
  const frec = 1000 * 60 * 5; // 5 minutes

  if (!(await needsSync(key, frec, force))) {
    return;
  }

  const maxAge = normalizedDate(
    new Date(Date.now() - MAX_REGISTRY_AGE),
    "hours",
  );
  logger.info(
    `Iniciando sincronización de registros desde ${formatDateTime(maxAge)}`,
  );

  const [jobRegistries, worktimeRegistries] = await Promise.all([
    fetchJobRegistries(odooClient, maxAge),
    fetchWorktimeRegistry(odooClient, sessionData.uid, sessionData.tz),
  ]);

  const [, , activityRegistries] = await Promise.all([
    reconciliateJobRegistries(jobRegistries!),
    reconliciateWorktimeRegistries(worktimeRegistries!, sessionData.uid),
    fetchActivityRegistries(odooClient, jobRegistries!),
  ]);

  const [, taskRegistries] = await Promise.all([
    reconciliateActivityRegistries(activityRegistries!),
    fetchTaskRegistries(odooClient, activityRegistries!),
  ]);

  await reconciliateTaskRegistries(taskRegistries!);

  await updateLastSync(key);
  logger.info("Sincronización de registros exitosa");
}

export async function syncResources(
  force: boolean = false,
  odooClient: OdooJSONRpc,
  sessionData: OdooSession,
) {
  const key = "sync::last_sync_res";
  const frec = 1000 * 60 * 15; // 15 minutes

  if (!(await needsSync(key, frec, force))) {
    return;
  }

  logger.info("Iniciando Sincronización de recursos");

  const [vehicles, companies, users] = await Promise.all([
    fetchVehicles(odooClient),
    fetchCompanies(odooClient),
    fetchUsers(odooClient),
  ]);

  await applyRemoteCompanyChange(companies);

  await Promise.all([
    applyRemoteVehicleChange(vehicles),
    applyRemoteUsersChange(users),
  ]);

  await updateLastSync(key);
  logger.info("Sincronización de recursos exitosa");
}

export async function syncItinerary(
  force: boolean = false,
  odooClient: OdooJSONRpc,
  sessionData: OdooSession,
) {
  const key = "sync::last_sync_itinerary";
  const frec = 1000 * 60 * 5; // 5 minutes

  if (!(await needsSync(key, frec, force))) {
    return;
  }

  logger.info("Iniciando Sincronización de itinerarios");

  const itineraries = await fetchItineraries(odooClient);

  const [, activities] = await Promise.all([
    applyRemoteItineraryChange(itineraries),
    fetchActivities(
      odooClient,
      itineraries.map((it) => it.id!),
    ),
  ]);

  const [, tasks] = await Promise.all([
    applyRemoteActivityChange(activities!),
    fetchTasks(
      odooClient,
      activities!.map((it) => it.id!),
    ),
  ]);

  await applyRemoteTaskChange(tasks!);

  await updateLastSync(key);
  logger.info("Sincronización de itinerarios exitosa");
}
