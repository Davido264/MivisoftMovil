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
import {
  WorktimeJobRegistrySelect,
  WorktimeRegistrySelect,
} from "@/lib/db/schema/worktime-registry";
import { transformError } from "@/lib/result";
import { Env } from "../odoo/env";
import { Environment } from "../odoo/_env";

const logger = Logger.getLogger("UPLOAD::WORKTIME-REGISTRY");

export async function uploadWorktimeRegistry(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace("upload::uploadWorktimeRegistry");
  logger.verbose("Subiendo registros pendientes");

  try {
    const worktimes = await getAllPendingWorktimeRegistries(userId, db);
    const grouped = worktimeRegistryGroupedByDay(worktimes);

    for (const worktimes of Object.values(grouped)) {
      await upload(worktimes, env);
    }

    logger.verbose("Subidas exitosas");
  } catch (e) {
    throw transformError(e, "Error subiendo registros", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

export async function linkRemoteWorktimeRegistry(
  env: Environment<Env>,
  userId: number,
) {
  const pop = Logger.startSubStackTrace("upload::linkRemoteWorktimeRegistry");
  logger.verbose("Vinculando registros pendientes");

  try {
    const relations = await getAllPendingJobRegistrysOdooIdForUser(userId, db);
    const grouped = relationsGroupedByDay(relations);

    for (const [day, rels] of Object.entries(grouped)) {
      await linkJobRegistryToWorktimeRegistry(
        env,
        userId,
        parseInt(day),
        rels.map((r) => r.odooJobRegistryId!),
      );
    }

    for (const [day, rels] of Object.entries(grouped)) {
      await markWorktimeRegistryJobRegistryClean(
        rels.map((r) => r.jobRegistryId),
        parseInt(day),
      );
    }

    logger.verbose("Subidas exitosas");
  } catch (e) {
    throw transformError(e, "Error subiendo registros", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

async function upload(
  worktimes: WorktimeRegistrySelect[],
  env: Environment<Env>,
) {
  const pop = Logger.startSubStackTrace("upload::worktime");
  try {
    worktimes.sort(comparator);

    const odooId = await bulkUploadWorktimeRegistries(
      env,
      worktimes.map(remotifyWorktimeRegistry),
    );

    await db.transaction(
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
    );
  } catch (e) {
    throw transformError(e, "Error al subir registros de jornadas", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
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
