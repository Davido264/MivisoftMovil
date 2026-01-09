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
  RemoteItinerary,
} from "@/lib/odoo/itinerary-company-vehicles";
import { fetchUsers } from "@/lib/odoo/users";
import {
  fetchActivities,
  fetchActivityRegistries,
  RemoteActivity,
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
import { fetchLatestWorktimeRegistry } from "@/lib/odoo/worktime-registry";
import { reconciliate as reconliciateWorktimeRegistries } from "@/lib/sync/worktime-registry";
import { OdooSession } from "@/lib/db/schema/user-session";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { updateLastSync } from "@/lib/sync/last-sync";
import { Logger } from "@/lib/logger";
import { ResultAsync } from "neverthrow";

const logger = Logger.getLogger("API::SYNC");

const MAX_REGISTRY_AGE = 30 * 24 * 3600 * 1000; // one month

export function syncRegistries(
  odooClient: OdooJSONRpc,
  sessionData: OdooSession,
) {
  const maxAge = normalizedDate(
    new Date(Date.now() - MAX_REGISTRY_AGE),
    "hours",
  );

  logger.verbose(
    `Iniciando sincronización de registros desde ${formatDateTime(maxAge)}`,
  );

  return ResultAsync.combine([
    fetchJobRegistries(odooClient, maxAge),
    fetchLatestWorktimeRegistry(odooClient, sessionData.uid, sessionData.tz),
  ])
    .andThen(([j, w]) =>
      ResultAsync.combine([
        reconciliateJobRegistries(j),
        reconliciateWorktimeRegistries(w, sessionData.uid),
        fetchActivityRegistries(odooClient, j),
      ]),
    )
    .andThen(([, , a]) =>
      ResultAsync.combine([
        reconciliateActivityRegistries(a),
        fetchTaskRegistries(odooClient, a),
      ]),
    )
    .andThen(([, t]) => reconciliateTaskRegistries(t))
    .map(() => updateLastSync("registry"))
    .map(() => logger.verbose("Sincronización de registros exitosa"));
}

export function syncResources(
  odooClient: OdooJSONRpc,
  sessionData: OdooSession,
) {
  logger.verbose("Iniciando Sincronización de recursos");

  return ResultAsync.combine([
    fetchVehicles(odooClient),
    fetchCompanies(odooClient),
    fetchUsers(odooClient),
  ])
    .andThen(([v, c, u]) =>
      applyRemoteCompanyChange(c).andThen(() =>
        ResultAsync.combine([
          applyRemoteVehicleChange(v),
          applyRemoteUsersChange(u),
        ]),
      ),
    )
    .map(() => updateLastSync("resource"))
    .map(() => logger.verbose("Sincronización de recursos exitosa"));
}

export function syncItinerary(
  odooClient: OdooJSONRpc,
  sessionData: OdooSession,
) {
  logger.verbose("Iniciando Sincronización de itinerarios");

  return fetchItineraries(odooClient)
    .andThen((i) =>
      ResultAsync.combine([
        applyRemoteItineraryChange(i),
        fetchActivities(odooClient, itineraryIds(i)),
      ]),
    )
    .andThen(([, a]) =>
      ResultAsync.combine([
        applyRemoteActivityChange(a),
        fetchTasks(odooClient, activityIds(a)),
      ]),
    )
    .andThen(([, t]) => applyRemoteTaskChange(t))
    .map(() => updateLastSync("itinerary"))
    .map(() => logger.verbose("Sincronización de itinerarios exitosa"));
}

function itineraryIds(itineraries: RemoteItinerary[]) {
  return itineraries.map((i) => i.id!);
}

function activityIds(activities: RemoteActivity[]) {
  return activities.map((i) => i.id!);
}
