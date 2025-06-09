import db, { transBehavior } from "@/lib/db";
import { Logger } from "@/lib/logger";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { bulkUploadWorktimeRegistries } from "@/lib/odoo/worktime-registry";
import { setServerIdForWorktimeRegistryImage } from "@/lib/db/actions/photos";
import {
  remotifyWorktimeRegistry,
  updateWorktimeRegistry,
} from "@/lib/db/actions/worktime-registry";
import { getAllPendingWorktimeRegistries } from "@/lib/db/queries/worktime-registry";

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
  const ids = await bulkUploadWorktimeRegistries(client, toUpload);

  await db.transaction(
    async (tx) => {
      for (let i = 0; i < pending.length; i++) {
        const toUpdate = { ...pending[i], id: ids[i] };
        await setServerIdForWorktimeRegistryImage(
          pending[i].id,
          `${toUpdate.id}`,
          tx,
        );
        await updateWorktimeRegistry(
          pending[i].id,
          { odooId: toUpdate.id },
          true,
          tx,
        );
      }
    },
    { behavior: transBehavior },
  );

  logger.info("Subida exitosa");
}
