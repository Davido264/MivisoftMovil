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
import { ActivityRegistrySelect } from "../db/schema/activity-registry";
import { ResultAsync } from "neverthrow";
import { transformError, wrapMultiErrors } from "../result";

const logger = Logger.getLogger("UPLOAD::ACTIVITY-REGISTRY");

export function uploadActivityRegistries(
  client: OdooJSONRpc,
  userId: number,
) {
  logger.info("Subiendo registros pendientes");

  return ResultAsync.fromPromise(
    getAllPendingActivityRegistries(userId, db),
    (e) => transformError(e, "Error al obtener registros pendientes"),
  )
    .andThen((acts) =>
      ResultAsync.combineWithAllErrors(
        acts.map((act) => uploadActivityRegistry(act, client)),
      ),
    )
    .map(() => logger.info("Subida exitosa"))
    .mapErr((e) => wrapMultiErrors(e, "Error al subir registros"));
}

function uploadActivityRegistry(
  act: ActivityRegistrySelect,
  client: OdooJSONRpc,
) {
  const toUpload = remotifyActivityRegistry(act);

  return ResultAsync.fromPromise(
    getJobRegistryOdooId(toUpload.job_registry_id),
    (e) => transformError(e, "Error al obtener id de registro de trabajo"),
  )
    .andThen(
      ResultAsync.fromThrowable(
        async (odooId) => {
          assert.notNull(odooId);
          toUpload.job_registry_id = odooId;
          return toUpload;
        },
        (e) => transformError(e, "Error al obtener id de registro de trabajo"),
      ),
    )
    .andThen((toUpload) => {
      if (toUpload.id) {
        return writeActivityRegistry(client, toUpload.id, toUpload);
      } else {
        return createActivityRegistry(client, toUpload);
      }
    })
    .andThen((odooId) =>
      ResultAsync.fromPromise(
        db.transaction(
          async (tx) => {
            await setServerIdForActivityRegistryImage(act.id, `${odooId}`, tx);
            await updateActivityRegistry(act.id, { odooId }, true, tx);
          },
          { behavior: transBehavior },
        ),
        (e) =>
          transformError(e, "Error al actualizar registro de actividad", act),
      ),
    );
}
