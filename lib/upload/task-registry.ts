import db from "@/lib/db";
import { Logger } from "@/lib/logger";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import {
  createTaskRegistry,
  writeTaskRegistry,
} from "@/lib/odoo/task-registry";
import {
  remotifyTaskRegistry,
  updateTaskRegistry,
} from "@/lib/db/actions/task-registry";
import { getAllPendingTaskRegistries } from "@/lib/db/queries/task-registries";
import { getActivityRegistryOdooId } from "../db/queries/activity-registries";
import assert from "@/lib/assert";

const logger = Logger.getLogger("UPLOAD::TASK-REGISTRY");

export async function uploadTaskRegistries(
  client: OdooJSONRpc,
  userId: number,
) {
  const pending = await getAllPendingTaskRegistries(userId, db);

  if (pending.length === 0) {
    return;
  }

  logger.info("Subiendo registros pendientes");
  for (const task of pending) {
    const toUpload = remotifyTaskRegistry(task);

    const odooId = await getActivityRegistryOdooId(
      toUpload.activity_registry_id,
    );
    assert.notNull(odooId);

    toUpload.activity_registry_id = odooId;
    if (toUpload.id) {
      await writeTaskRegistry(client, toUpload.id, toUpload);
    } else {
      toUpload.id = await createTaskRegistry(client, toUpload);
    }

    await updateTaskRegistry(task.id, {
      odooId: toUpload.id,
      lastsync: new Date(),
    });
  }

  logger.info("Subida exitosa");
}
