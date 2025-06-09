import { createJobRegistry, writeJobRegistry } from "@/lib/odoo/job-registry";
import db, { transBehavior } from "@/lib/db";
import {
  remotifyJobRegistry,
  updateJobRegistry,
} from "@/lib/db/actions/job-registry";
import { Logger } from "@/lib/logger";
import { setSeverIdForJobRegistryImage } from "@/lib/db/actions/photos";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { getAllPendingJobRegistries } from "../db/queries/job-registry";

const logger = Logger.getLogger("UPLOAD::JOB-REGISTRY");

export async function uploadJobRegistries(client: OdooJSONRpc, userId: number) {
  const pending = await getAllPendingJobRegistries(userId, db);

  if (pending.length === 0) {
    return;
  }

  logger.info("Subiendo registros pendientes");
  for (const job of pending) {
    const toUpload = remotifyJobRegistry(job);
    if (toUpload.id) {
      await writeJobRegistry(client, toUpload.id, toUpload);
    } else {
      toUpload.id = await createJobRegistry(client, toUpload);
    }

    await db.transaction(
      async (tx) => {
        await setSeverIdForJobRegistryImage(job.id, `${toUpload.id}`, tx);
        await updateJobRegistry(job.id, { odooId: toUpload.id }, true, tx);
      },
      { behavior: transBehavior },
    );
  }

  logger.info("Subida exitosa");
}
