import { Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import { defaultDatabaseDirectory, openDatabaseSync } from "expo-sqlite";
import { transformError } from "@/lib/result";
import { globalStore } from "@/lib/store/application-state";
import { Result, ResultAsync } from "neverthrow";
import { getAllPendingJobRegistries } from "@/lib/db/queries/job-registry";
import { getAllPendingActivityRegistries } from "@/lib/db/queries/activity-registries";
import { getAllPendingTaskRegistries } from "@/lib/db/queries/task-registries";
import {
  getAllPendingJobRegistrysOdooIdForUser,
  getAllPendingWorktimeRegistries,
} from "@/lib/db/queries/worktime-registry";
import { getDeviceInfo } from "@/lib/api/device";

export async function exportLogs() {
  if (!db) {
    return false;
  }

  await exportLogger.info("Exportando logs...");
  await exportLogger.info("Snapshot del estado de la aplicacióñ", {
    ...globalStore.getState(),
    odooClient: {},
  });

  await ResultAsync.fromThrowable(async () => {
    const { sessionData } = globalStore.getState();
    if (sessionData == null) {
      return;
    }

    await exportLogger.info("Información del dispositivo", await getDeviceInfo());

    await exportLogger.info("Cambios pendientes por hacer", {
      jobRegistry: await getAllPendingJobRegistries(sessionData.uid),
      activityRegistry: await getAllPendingActivityRegistries(sessionData.uid),
      taskRegistry: await getAllPendingTaskRegistries(sessionData.uid),
      worktimeRegistry: await getAllPendingWorktimeRegistries(sessionData.uid),
      worktimeJobRelation: await getAllPendingJobRegistrysOdooIdForUser(
        sessionData.uid,
      ),
    });
  })();

  const transResult = Result.fromThrowable(
    () => db!.execSync("PRAGMA wal_checkpoint(FULL);"),
    (e) => transformError(e, "Error realizando un checkpoint de los logs"),
  )();

  if (transResult.isErr()) {
    globalStore.setState({ lastError: transResult.error });
    return false;
  }

  const isAvailableResult = await ResultAsync.fromPromise(
    Sharing.isAvailableAsync(),
    (e) =>
      transformError(
        e,
        "Error consultando la disponibilidad de la función de compartir",
      ),
  );

  if (isAvailableResult.isErr()) {
    globalStore.setState({ lastError: isAvailableResult.error });
    return false;
  }

  if (!isAvailableResult.value) {
    return false;
  }

  const shareResult = await ResultAsync.fromPromise(
    Sharing.shareAsync(
      `file://${Paths.join(defaultDatabaseDirectory, "logs.db")}`,
      {
        mimeType: "application/x-sqlite3",
        dialogTitle: "Exportar logs",
      },
    ),
    (e) => transformError(e, "Error exportando logs"),
  );

  if (shareResult.isErr()) {
    globalStore.setState({ lastError: shareResult.error });
    return false;
  }

  return shareResult.isOk();
}

type LoggerLevel = number;
const loggers: Map<string, Logger> = new Map<string, Logger>();
export const levels = Object.freeze({
  info: 1 as LoggerLevel,
  warn: 2 as LoggerLevel,
  error: 3 as LoggerLevel,
});

let defaultLevel: LoggerLevel = levels.info;

export type LogEntry = {
  level: LoggerLevel;
  logger: string;
  date: Date;
  message: string;
  object?: any;
};

export class Logger {
  #name: string;

  private constructor(name: string) {
    this.#name = name;
  }

  static getLogger(name: string) {
    if (!loggers.has(name)) {
      loggers.set(name, new Logger(name));
    }
    return loggers.get(name)!;
  }

  get name() {
    return this.#name;
  }

  #formatMsg(msg: string, obj: any | undefined = undefined) {
    return `[${this.#name}]: ${msg.trimEnd()} ${
      obj !== undefined ? JSON.stringify(obj) : ""
    }`;
  }

  #writeDb(level: string, msg: string, obj: any | undefined = undefined) {
    if (!db) {
      return;
    }

    try {
      db.runSync(
        "INSERT INTO logs (level, logger, message, object) VALUES (?, ?, ?, ?);",
        level,
        this.#name,
        msg,
        obj ? JSON.stringify(obj) : null,
      );
    } catch {}
  }

  info(msg: string, obj: any | undefined = undefined) {
    if (defaultLevel > levels.info) {
      return;
    }
    console.log(this.#formatMsg(msg, obj));
    this.#writeDb("INFO", msg, obj);
  }

  warn(msg: string, obj: any | undefined = undefined) {
    if (defaultLevel > levels.warn) {
      return;
    }
    console.log(this.#formatMsg(msg, obj));
    this.#writeDb("WARN", msg, obj);
  }

  error(msg: string, obj: any | undefined = undefined) {
    if (defaultLevel > levels.error) {
      return;
    }
    console.error(this.#formatMsg(msg, obj));
    this.#writeDb("ERROR", msg, obj);
  }
}

const exportLogger = Logger.getLogger("EXPORT");
export function setGlobalLevel(level: LoggerLevel) {
  defaultLevel = level;
}

const db = openDatabaseSync("logs.db");

const maxLogAge = 86400000; // 1 day
db.execSync(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT,
  logger TEXT,
  date INTEGER DEFAULT CURRENT_TIMESTAMP,
  message TEXT,
  object TEXT
);
DELETE FROM logs WHERE date < ${new Date().valueOf() - maxLogAge};
INSERT INTO logs (level, logger, message) VALUES ('MARKER','MARKER','------ APPLICATION START ------');
`);

export default levels;
