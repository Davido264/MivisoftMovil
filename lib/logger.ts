import { Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import { defaultDatabaseDirectory, openDatabaseSync } from "expo-sqlite";
import { ApplicationError, transformError } from "@/lib/result";
import { globalStore } from "@/lib/store/application-state";
import { getAllPendingJobRegistries } from "@/lib/db/queries/job-registry";
import { getAllPendingActivityRegistries } from "@/lib/db/queries/activity-registries";
import { getAllPendingTaskRegistries } from "@/lib/db/queries/task-registries";
import {
  getAllPendingJobRegistrysOdooIdForUser,
  getAllPendingWorktimeRegistries,
} from "@/lib/db/queries/worktime-registry";
import { getDeviceInfo } from "@/lib/api/device";
import Toast from "react-native-toast-message";

export async function exportLogs() {
  if (!db) {
    return false;
  }

  await exportLogger.verbose("Exportando logs...");
  await exportLogger.verbose("Snapshot del estado de la aplicación", {
    ...globalStore.getState(),
    odooClient: {},
  });

  try {
    const { sessionData } = globalStore.getState();
    if (sessionData != null) {
      await exportLogger.verbose(
        "Información del dispositivo",
        await getDeviceInfo().catch(() => ({})),
      );

      await exportLogger.verbose("Cambios pendientes por hacer", {
        jobRegistry: await getAllPendingJobRegistries(sessionData.uid),
        activityRegistry: await getAllPendingActivityRegistries(
          sessionData.uid,
        ),
        taskRegistry: await getAllPendingTaskRegistries(sessionData.uid),
        worktimeRegistry: await getAllPendingWorktimeRegistries(
          sessionData.uid,
        ),
        worktimeJobRelation: await getAllPendingJobRegistrysOdooIdForUser(
          sessionData.uid,
        ),
      });
    }

    db!.execSync("PRAGMA wal_checkpoint(FULL);");

    if (!(await Sharing.isAvailableAsync())) {
      return false;
    }

    await Sharing.shareAsync(
      `file://${Paths.join(defaultDatabaseDirectory, "logs.db")}`,
      {
        mimeType: "application/x-sqlite3",
        dialogTitle: "Exportar logs",
      },
    );
    return true;
  } catch (error) {
    exportLogger.error(transformError(error, "Error exportando los logs"));
    return false;
  }
}

type LoggerLevel = number;
const loggers: Map<string, Logger> = new Map<string, Logger>();
export const levels = Object.freeze({
  info: 0 as LoggerLevel,
  verbose: 1 as LoggerLevel,
  warn: 2 as LoggerLevel,
  error: 3 as LoggerLevel,
});

let defaultLevel: LoggerLevel = levels.verbose;

export type LogEntry = {
  level: LoggerLevel;
  logger: string;
  date: Date;
  message: string;
  object?: any;
};

export class Logger {
  #name: string;
  toastOnWarn: boolean;

  private constructor(name: string) {
    this.#name = name;
    this.toastOnWarn = false;
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

  verbose(msg: string, obj: any | undefined = undefined) {
    if (defaultLevel > levels.verbose) {
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

  error(error: ApplicationError) {
    if (defaultLevel > levels.error) {
      return;
    }
    console.error(this.#formatMsg(error.message, error));
    Toast.show({
      type: "error",
      text1: "Error",
      text2: error.message,
      swipeable: true,
      autoHide: true,
    });
    globalStore.setState({ lastError: error });
    this.#writeDb("ERROR", error.message, error);
  }

  info(msg: string, obj: any | undefined = undefined) {
    if (defaultLevel > levels.info) {
      return;
    }
    console.log(this.#formatMsg(msg, obj));
    Toast.show({
      type: "success",
      text1: msg,
      swipeable: true,
      autoHide: true,
    });
    this.#writeDb("INFO", msg, obj);
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
