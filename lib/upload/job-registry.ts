import { createJobRegistry, writeJobRegistry } from "@/lib/odoo/job-registry";
import db, { transBehavior } from "@/lib/db";
import {
  remotifyJobRegistry,
  updateJobRegistry,
} from "@/lib/db/actions/job-registry";
import { Logger } from "@/lib/logger";
import { setSeverIdForJobRegistryImage } from "@/lib/db/actions/photos";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { getAllPendingJobRegistries } from "@/lib/db/queries/job-registry";
import { ResultAsync } from "neverthrow";
import { transformError, wrapMultiErrors } from "@/lib/result";
import { JobRegistrySelect } from "../db/schema/job-registry";
import { updateWorktimeRegistryJobRegistryOdooId } from "../db/actions/worktime-registry";

const logger = Logger.getLogger("UPLOAD::JOB-REGISTRY");

export function uploadJobRegistries(client: OdooJSONRpc, userId: number) {
  logger.info("Subiendo registros pendientes");

  return ResultAsync.fromPromise(getAllPendingJobRegistries(userId, db), (e) =>
    transformError(e, "Error al obtener registros pendientes"),
  )
    .andThen((jobs) =>
      ResultAsync.combineWithAllErrors(
        jobs.map((j) => uploadRegistry(j, client)),
      ),
    )
    .map(() => logger.info("Subida exitosa"))
    .mapErr((e) => wrapMultiErrors(e, "Error al subir registros"));
}

function uploadRegistry(job: JobRegistrySelect, client: OdooJSONRpc) {
  const toUpload = remotifyJobRegistry(job);

  return (
    toUpload.id
      ? writeJobRegistry(client, toUpload.id, toUpload)
      : createJobRegistry(client, toUpload)
  ).map((odooId) =>
    ResultAsync.fromPromise(
      db.transaction(
        async (tx) => {
          await setSeverIdForJobRegistryImage(job.id, `${odooId}`, tx);
          await updateJobRegistry(job.id, { odooId }, true, tx);
          await updateWorktimeRegistryJobRegistryOdooId(job.id, odooId, tx);
        },
        { behavior: transBehavior },
      ),
      (e) => transformError(e, "Error al actualizar registro de trabajo", job),
    ),
  );
}
