import db, { transBehavior } from "@/lib/db";
import { setServerIdForWorktimeRegistryImage } from "@/lib/db/actions/photos";
import {
  remotifyWorktimeRegistry,
  updateWorktimeRegistry,
} from "@/lib/db/actions/worktime-registry";
import { getAllPendingWorktimeRegistries } from "@/lib/db/queries/worktime-registry";
import { Logger } from "@/lib/logger";
import { bulkUploadWorktimeRegistries } from "@/lib/odoo/worktime-registry";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";

const logger = Logger.getLogger("UPLOAD::WORKTIME-REGISTRY");

export async function uploadWorktimeRegistry(
  client: OdooJSONRpc,
  userId: number,
) {
  const pending = await getAllPendingWorktimeRegistries(userId, db);

  if (pending.length === 0) {
    return;
  }

  logger.info("Subiendo registros pendientes");
  const toUpload = pending.map((i) => remotifyWorktimeRegistry(i));
  const registerId = await bulkUploadWorktimeRegistries(client, toUpload);

  await db.transaction(
    async (tx) => {
      for (let i = 0; i < pending.length; i++) {
        await setServerIdForWorktimeRegistryImage(
          pending[i].id,
          `${registerId}`,
          tx,
        );
        await updateWorktimeRegistry(pending[i].id, {}, true, tx);
      }
    },
    { behavior: transBehavior },
  );

  logger.info("Subida exitosa");
}
