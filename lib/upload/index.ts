import { Logger } from "@/lib/logger";
import { odoo } from "../odoo/env";
import { OdooSession } from "../db/schema/user-session";
import { transformError } from "../result";
import {
  createRemoteActivityRegistries,
  updateRemoteActivityRegistries,
} from "./activity-registry";
import { uploadWorktimeRegistry } from "./worktime-registry";
import {
  createRemoteJobRegistries,
  updateRemoteJobRegistries,
} from "./job-registry";
import {
  createRemoteTaskRegistries,
  updateRemoteTaskRegistries,
} from "./task-registry";

const logger = Logger.getLogger("UPLOAD");

export async function uploadRegisters(sessionData: OdooSession) {
  const pop = Logger.startSubStackTrace("upload::uploadRegisters");
  try {
    Logger.pushStackTrace("upload::uploadRegisters+connect");
    const { env, usr } = await odoo.connect({
      sessionId: sessionData.sid,
    });
    Logger.popStackTrace();

    logger.verbose("Subiendo registros de jornada pendientes");
    Logger.pushStackTrace("upload::uploadRegisters+worktime");
    await uploadWorktimeRegistry(env, usr.id);
    Logger.popStackTrace();

    logger.verbose("Subiendo registros de trabajo pendientes");
    Logger.pushStackTrace("upload::uploadRegisters+job");
    await updateRemoteJobRegistries(env, usr.id);
    await createRemoteJobRegistries(env, usr.id);
    Logger.popStackTrace();

    logger.verbose("Subiendo registros de actividad pendientes");
    Logger.pushStackTrace("upload::uploadRegisters+activity");
    await updateRemoteActivityRegistries(env, usr.id);
    await createRemoteActivityRegistries(env, usr.id);
    Logger.popStackTrace();

    logger.verbose("Subiendo registros de tareas pendientes");
    Logger.pushStackTrace("upload::uploadRegisters+task");
    await updateRemoteTaskRegistries(env, usr.id);
    await createRemoteTaskRegistries(env, usr.id);
    Logger.popStackTrace();
  } catch (e) {
    throw transformError(e, "Error al subir registros", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}
