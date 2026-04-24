import db, { transBehavior } from "@/lib/db";
import assert from "@/lib/assert";
import {
  RemoteActivityRegistry,
  RemoteActivity,
} from "@/lib/odoo/act-registry";
import { getLocalActivityFromRegistryOdooId } from "@/lib/db/queries/activity-registries";
import {
  purgeDeletedActivityRegistries,
  updateActivityRegistry,
  upsertActivityRegistry,
} from "@/lib/db/actions/activity-registry";
import { getLocalJobRegistryFromOdooId } from "@/lib/db/queries/job-registry";
import {
  deleteNonRemobeActivities,
  upsertActivities,
} from "@/lib/db/actions/resources";
import { transformError } from "@/lib/result";
import { Logger } from "@/lib/logger";

const logger = Logger.getLogger("activity-registry");

export async function reconciliateActivityRegistries(
  remoteEntities: RemoteActivityRegistry[],
) {
  try {
    Logger.pushStackTrace("activity-registry::reconciliate");
    logger.verbose("reconciliateActivityRegistries called", {
      count: remoteEntities.length,
      sample: remoteEntities.slice(0, 3),
    });

    const jobRegistryIds = remoteEntities.map((r) => r.job_registry_id);
    logger.verbose("job_registry_ids to check", { jobRegistryIds });

    await db.transaction(
      async (tx) => {
        for (const remote of remoteEntities) {
          assert.notNull(remote.id, "remote.id");

          const local = await getLocalActivityFromRegistryOdooId(remote.id, tx);

          if (local === undefined) {
            assert.notNull(remote.job_registry_id, "remote.job_registry_id");
            const jobRegistry = await getLocalJobRegistryFromOdooId(
              remote.job_registry_id,
              tx,
            );

            if (jobRegistry === undefined) {
              logger.verbose("Job registry not found in local DB", {
                job_registry_id: remote.job_registry_id,
                remoteActivityRegistry: remote,
              });
              throw {
                type: "DatabaseInconsistencyError",
                message: `No existe un trabajo con server Id ${remote.job_registry_id}`,
              };
            }

            await upsertActivityRegistry(
              {
                odooId: remote.id,
                activityId: remote.activity_id,
                jobRegistryId: jobRegistry.id!,
                observation: remote.observation,
                userId: remote.uid,
                lng: remote.lng,
                lat: remote.lat,
              },
              true,
              tx,
            );
            continue;
          }

          local.lastsync ??= new Date(0);
          // if (
          //   local.lastmod <= local.lastsync &&
          //   remote.lastmod <= local.lastsync
          // ) {
          //   continue; // all synced
          // }

          // if (local.lastmod > local.lastsync) {
          //   // TODO: For now, local wins always
          //   continue;
          // }

          // if (
          //   local.lastmod > local.lastsync &&
          //   remote.lastmod > local.lastsync
          // ) {
          //   // TODO: Conflict resolution
          //   continue;
          // }

          await updateActivityRegistry(
            local.id,
            {
              odooId: remote.id,
              activityId: remote.activity_id,
              observation: remote.observation,
              userId: remote.uid,
              lng: remote.lng,
              lat: remote.lat,
            },
            true,
            tx,
          );
        }

        await purgeDeletedActivityRegistries(
          remoteEntities.map((i) => i.id),
          tx,
        );
      },
      { behavior: transBehavior },
    );
  } catch (e) {
    console.error(e);
    throw transformError(e, "Error al reconciliar registros de actividad", {
      stackTrace: Logger.stackTrace,
    });
  }
}

export async function applyRemoteActivityChange(activities: RemoteActivity[]) {
  try {
    Logger.pushStackTrace("activity-registry::applyRemoteActivityChange");
    await db.transaction(
      async (tx) => {
        await upsertActivities(activities, tx);
        await deleteNonRemobeActivities(
          activities.map((i) => i.id!),
          tx,
        );
      },
      { behavior: transBehavior },
    );
  } catch (e) {
    throw transformError(e, "Error al aplicar cambios remotos en actividades", {
      stackTrace: Logger.stackTrace,
    });
  }
}
