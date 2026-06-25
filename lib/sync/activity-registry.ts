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
  const pop = Logger.startSubStackTrace("activity-registry::reconciliate");
  try {
    logger.verbose("reconciliateActivityRegistries called", {
      count: remoteEntities.length,
    });

    // ponytail: igual que task reconcile: un registro con trabajo padre
    // inexistente se omite con warning, no rompe toda la sincronización.
    const skipped: any[] = [];

    await db.transaction(
      async (tx) => {
        for (const remote of remoteEntities) {
          try {
            assert.notNull(remote.id, "remote.id");

            const local = await getLocalActivityFromRegistryOdooId(
              remote.id,
              tx,
            );

            if (local === undefined) {
              assert.notNull(remote.job_registry_id, "remote.job_registry_id");
              const jobRegistry = await getLocalJobRegistryFromOdooId(
                remote.job_registry_id,
                tx,
              );

              if (jobRegistry === undefined) {
                skipped.push({
                  odooId: remote.id,
                  activityId: remote.activity_id,
                  jobRegistryId: remote.job_registry_id,
                  reason: "trabajo local inexistente",
                });
                logger.warn("Registro de actividad omitido en reconcile", {
                  odooId: remote.id,
                  activityId: remote.activity_id,
                  jobRegistryId: remote.job_registry_id,
                  reason: "no existe el trabajo local",
                });
                continue;
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
          } catch (e: any) {
            skipped.push({
              odooId: remote.id,
              activityId: remote.activity_id,
              jobRegistryId: remote.job_registry_id,
              reason: e?.message ?? String(e),
            });
            logger.warn(
              "Error reconciliando un registro de actividad, se omite",
              {
                odooId: remote.id,
                activityId: remote.activity_id,
                jobRegistryId: remote.job_registry_id,
                type: e?.type,
                error: e?.message ?? String(e),
              },
            );
          }
        }

        await purgeDeletedActivityRegistries(
          remoteEntities.map((i) => i.id),
          tx,
        );
      },
      { behavior: transBehavior },
    );

    if (skipped.length > 0) {
      logger.warn(
        `Reconciliación de actividades: ${skipped.length}/${remoteEntities.length} registros omitidos`,
        { skipped: skipped.slice(0, 20) },
      );
    }
  } catch (e) {
    throw transformError(e, "Error al reconciliar registros de actividad", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
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
