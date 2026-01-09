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
import { getActivityRegistryOdooId } from "@/lib/db/queries/activity-registries";
import assert from "@/lib/assert";
import { TaskRegistrySelect } from "@/lib/db/schema/task-registry";
import { ResultAsync } from "neverthrow";
import { transformError, wrapMultiErrors } from "@/lib/result";

const logger = Logger.getLogger("UPLOAD::TASK-REGISTRY");

export function uploadTaskRegistries(client: OdooJSONRpc, userId: number) {
  logger.verbose("Subiendo registros pendientes");
  return ResultAsync.fromPromise(getAllPendingTaskRegistries(userId, db), (e) =>
    transformError(e, "Error al obtener registros pendientes"),
  )
    .andThen((tasks) =>
      ResultAsync.combineWithAllErrors(
        tasks.map((t) => uploadTaskRegistry(t, client)),
      ),
    )
    .map(() => logger.verbose("Subida exitosa"))
    .mapErr((e) => wrapMultiErrors(e, "Error al subir registros"));
}

function uploadTaskRegistry(task: TaskRegistrySelect, client: OdooJSONRpc) {
  const toUpload = remotifyTaskRegistry(task);

  return ResultAsync.fromPromise(
    getActivityRegistryOdooId(toUpload.activity_registry_id),
    (e) => transformError(e, "Error obteniendo id de registro de actividad"),
  )
    .andThen(
      ResultAsync.fromThrowable(
        async (odooId) => {
          assert.notNull(odooId);
          toUpload.activity_registry_id = odooId;
          return toUpload;
        },
        (e) =>
          transformError(e, "Error obteniendo id de registro de actividad"),
      ),
    )
    .andThen((toUpload) => {
      if (toUpload.id) {
        return writeTaskRegistry(client, toUpload.id, toUpload);
      } else {
        return createTaskRegistry(client, toUpload);
      }
    })
    .andThen((odooId) =>
      ResultAsync.fromPromise(
        updateTaskRegistry(
          task.id,
          {
            odooId,
          },
          true,
        ),
        (e) => transformError(e, "Error al actualizar registro de tarea", task),
      ),
    );
}
