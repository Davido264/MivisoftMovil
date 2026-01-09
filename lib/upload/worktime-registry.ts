import db, { transBehavior } from "@/lib/db";
import { setServerIdForWorktimeRegistryImage } from "@/lib/db/actions/photos";
import {
  markWorktimeRegistryJobRegistryClean,
  remotifyWorktimeRegistry,
  updateWorktimeRegistry,
} from "@/lib/db/actions/worktime-registry";
import {
  getAllPendingJobRegistrysOdooIdForUser,
  getAllPendingWorktimeRegistries,
} from "@/lib/db/queries/worktime-registry";
import { Logger } from "@/lib/logger";
import {
  bulkUploadWorktimeRegistries,
  linkJobRegistryToWorktimeRegistry,
} from "@/lib/odoo/worktime-registry";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import {
  WorktimeJobRegistrySelect,
  WorktimeRegistrySelect,
} from "@/lib/db/schema/worktime-registry";
import { ResultAsync } from "neverthrow";
import { transformError, wrapMultiErrors } from "@/lib/result";

const logger = Logger.getLogger("UPLOAD::WORKTIME-REGISTRY");

export function uploadWorktimeRegistry(client: OdooJSONRpc, userId: number) {
  logger.verbose("Subiendo registros pendientes");

  return ResultAsync.fromPromise(
    getAllPendingWorktimeRegistries(userId, db),
    (e) => transformError(e, "Error al obtener registros pendientes"),
  )
    .map(worktimeRegistryGroupedByDay)
    .andThen((grouped) =>
      ResultAsync.combineWithAllErrors(
        Object.values(grouped).map((worktimes) => upload(worktimes, client)),
      ),
    )
    .map(() => logger.verbose("Subidas exitosas"))
    .mapErr((e) => wrapMultiErrors(e, "Error subiendo registros"));
}

export function linkRemoteWorktimeRegistry(
  client: OdooJSONRpc,
  userId: number,
) {
  logger.verbose("Vinculando registros pendientes");

  return ResultAsync.fromPromise(
    getAllPendingJobRegistrysOdooIdForUser(userId, db),
    (e) => transformError(e, "Error al obtener registros de trabajos"),
  )
    .map((r) => relationsGroupedByDay(r))
    .andThrough((grouped) =>
      ResultAsync.combineWithAllErrors(
        Object.entries(grouped).map(([day, rels]) =>
          linkJobRegistryToWorktimeRegistry(
            client,
            userId,
            parseInt(day),
            rels.map((r) => r.odooJobRegistryId!),
          ),
        ),
      ),
    )
    .andThen((grouped) =>
      ResultAsync.combineWithAllErrors(
        Object.entries(grouped).map(([day, rels]) =>
          ResultAsync.fromPromise(
            markWorktimeRegistryJobRegistryClean(
              rels.map((r) => r.jobRegistryId),
              parseInt(day),
            ),
            (e) =>
              transformError(e, "Error al marcar relaciones como actualizadas"),
          ),
        ),
      ),
    )
    .map(() => logger.verbose("Subidas exitosas"))
    .mapErr((e) => wrapMultiErrors(e, "Error subiendo registros"));
}

function upload(worktimes: WorktimeRegistrySelect[], client: OdooJSONRpc) {
  worktimes.sort(comparator);

  return bulkUploadWorktimeRegistries(
    client,
    worktimes.map(remotifyWorktimeRegistry),
  ).andThen((odooId) =>
    ResultAsync.fromPromise(
      db.transaction(
        async (tx) => {
          for (const register of worktimes) {
            await setServerIdForWorktimeRegistryImage(
              register.id,
              `${odooId}`,
              tx,
            );
            await updateWorktimeRegistry(register.id, {}, true, tx);
          }
        },
        { behavior: transBehavior },
      ),
      (e) => transformError(e, "Error al subir registros de jornadas"),
    ),
  );
}

function worktimeRegistryGroupedByDay(worktimes: WorktimeRegistrySelect[]) {
  const result = {} as any;
  for (const worktime of worktimes) {
    const day = worktime.day;
    if (!result[day]) {
      result[day] = [];
    }
    result[day].push(worktime);
  }
  return result as Record<string, WorktimeRegistrySelect[]>;
}

function comparator(a: WorktimeRegistrySelect, b: WorktimeRegistrySelect) {
  return a.startDate.valueOf() - b.startDate.valueOf();
}

function relationsGroupedByDay(relations: WorktimeJobRegistrySelect[]) {
  const result = {} as any;
  for (const relation of relations) {
    const day = relation.day;
    if (!result[day]) {
      result[day] = [];
    }
    result[day].push(relation);
  }
  return result as Record<string, WorktimeJobRegistrySelect[]>;
}
