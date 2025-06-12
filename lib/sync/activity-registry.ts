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

export async function reconciliateActivityRegistries(
  remoteEntities: RemoteActivityRegistry[],
) {
  db.transaction(
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
            throw {
              type: "DatabaseInconsistencyError",
              message: `No existe un trabajo con serverId ${remote.job_registry_id}`,
            };
          }

          await upsertActivityRegistry(
            {
              activityId: remote.activity_id,
              jobRegistryId: jobRegistry.id!,
              observation: remote.observation,
              odooId: remote.id,
              userId: remote.uid,
              lng: remote.lng,
              lat: remote.lat,
            },
            true,
            tx,
          );
          continue;
        }

        assert.notNull(local.lastsync);
        if (
          local.lastmod <= local.lastsync &&
          remote.lastmod <= local.lastsync
        ) {
          continue; // all synced
        }

        if (local.lastmod > local.lastsync) {
          // TODO: For now, local wins always
          continue;
        }

        if (local.lastmod > local.lastsync && remote.lastmod > local.lastsync) {
          // TODO: Conflict resolution
          continue;
        }

        await updateActivityRegistry(
          local.id,
          {
            activityId: remote.activity_id,
            observation: remote.observation,
            odooId: remote.id,
            userId: remote.uid,
            lng: remote.lng,
            lat: remote.lat,
          },
          true,
          tx,
        );
      }

      await purgeDeletedActivityRegistries(
        remoteEntities.map((i) => i.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );
}

export async function applyRemoteActivityChange(activities: RemoteActivity[]) {
  return db.transaction(
    async (tx) => {
      await upsertActivities(activities, tx);
      await deleteNonRemobeActivities(
        activities.map((i) => i.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );
}
