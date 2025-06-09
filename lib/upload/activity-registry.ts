import db, { transBehavior } from "@/lib/db";
import { Logger } from "@/lib/logger";
import { setServerIdForActivityRegistryImage } from "@/lib/db/actions/photos";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import {
  createActivityRegistry,
  writeActivityRegistry,
} from "@/lib/odoo/act-registry";
import {
  remotifyActivityRegistry,
  updateActivityRegistry,
} from "@/lib/db/actions/activity-registry";
import { getAllPendingActivityRegistries } from "@/lib/db/queries/activity-registries";
import { getJobRegistryOdooId } from "@/lib/db/queries/job-registry";
import assert from "@/lib/assert";

const logger = Logger.getLogger("UPLOAD::ACTIVITY-REGISTRY");

export async function uploadActivityRegistries(
  client: OdooJSONRpc,
  userId: number,
) {
  const pending = await getAllPendingActivityRegistries(userId, db);

  if (pending.length === 0) {
    return;
  }

  logger.info("Subiendo registros pendientes");
  for (const act of pending) {
    const toUpload = remotifyActivityRegistry(act);

    const odooId = await getJobRegistryOdooId(toUpload.job_registry_id);
    assert.notNull(odooId);

    toUpload.job_registry_id = odooId;

    if (toUpload.id) {
      await writeActivityRegistry(client, toUpload.id, toUpload);
    } else {
      toUpload.id = await createActivityRegistry(client, toUpload);
    }

    await db.transaction(
      async (tx) => {
        await setServerIdForActivityRegistryImage(act.id, `${toUpload.id}`, tx);
        await updateActivityRegistry(act.id, { odooId: toUpload.id }, true, tx);
      },
      { behavior: transBehavior },
    );
  }

  logger.info("Subida exitosa");
}
