import {
  createJobRegistry,
  writeEndDateTime,
  writeJobRegistry,
} from "@/lib/odoo/job-registry";
import db, { transBehavior } from "@/lib/db";
import {
  remotifyJobRegistry,
  updateJobRegistry,
} from "@/lib/db/actions/job-registry";
import { Logger } from "@/lib/logger";
import { setSeverIdForJobRegistryImage } from "@/lib/db/actions/photos";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import {
  getAllPendingJobRegistries,
  getEndDateTimesOdooIdsAndIds,
} from "@/lib/db/queries/job-registry";
import { ResultAsync } from "neverthrow";
import { transformError, wrapMultiErrors } from "@/lib/result";
import { JobRegistrySelect } from "../db/schema/job-registry";
import { updateWorktimeRegistryJobRegistryOdooId } from "../db/actions/worktime-registry";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { formatOdoo } from "../date";

const logger = Logger.getLogger("UPLOAD::JOB-REGISTRY");
const retriggersQueueKey = "job-registry::retriggers::queue";

export function uploadJobRegistries(client: OdooJSONRpc, userId: number) {
  logger.verbose("Subiendo registros pendientes");

  return ResultAsync.fromPromise(getAllPendingJobRegistries(userId, db), (e) =>
    transformError(e, "Error al obtener registros pendientes"),
  )
    .andThen((jobs) =>
      ResultAsync.combineWithAllErrors(
        jobs.map((j) => uploadRegistry(j, client)),
      ),
    )
    .map(() => logger.verbose("Subida exitosa"))
    .mapErr((e) => wrapMultiErrors(e, "Error al subir registros"));
}

export function retriggerJobRegistryStatusComputation(
  client: OdooJSONRpc,
  userId: number,
) {
  logger.verbose("Recalculando status");
  return ResultAsync.fromSafePromise(
    AsyncStorage.getItem(retriggersQueueKey).then((r) =>
      r != null ? (JSON.parse(r) as number[]) : [],
    ),
  )
    .andThen((r) =>
      ResultAsync.fromPromise(
        getEndDateTimesOdooIdsAndIds(r).then((r) =>
          r.map((re) => ({
            localId: re.localId,
            odooId: re.odooId!,
            endDateTime: formatOdoo(re.endDateTime!),
          })),
        ),
        (e) =>
          transformError(
            e,
            "No se pudo consultar las fechas de finalización para los ids",
            r,
          ),
      ),
    )
    .andThen((r) =>
      ResultAsync.combineWithAllErrors(
        r.map((i) =>
          updateEndDateTime(i.endDateTime, i.odooId, i.localId, client),
        ),
      ),
    )
    .andThen(() =>
      ResultAsync.fromPromise(
        AsyncStorage.setItem(retriggersQueueKey, JSON.stringify([])),
        (e) => transformError(e, "No se pudo vaciar la cola"),
      ),
    );
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
          if (toUpload.end_datetime) {
            enqueueRetrigger(job.id);
          }
        },
        { behavior: transBehavior },
      ),
      (e) => transformError(e, "Error al actualizar registro de trabajo", job),
    ),
  );
}

async function enqueueRetrigger(id: number) {
  const queue = await AsyncStorage.getItem(retriggersQueueKey).then((r) =>
    r != null ? JSON.parse(r) : [],
  );
  queue.push(id);
  await AsyncStorage.setItem(retriggersQueueKey, JSON.stringify(queue));
}

function updateEndDateTime(
  endDateTime: string,
  odooId: number,
  localId: number,
  client: OdooJSONRpc,
) {
  return writeEndDateTime(client, odooId, endDateTime).map(() =>
    ResultAsync.fromPromise(
      db.transaction(
        async (tx) => {
          await updateJobRegistry(localId, {}, true, tx);
        },
        { behavior: transBehavior },
      ),
      (e) =>
        transformError(e, "Error al actualizar registro de trabajo", localId),
    ),
  );
}
