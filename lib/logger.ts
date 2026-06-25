import { Paths } from "expo-file-system/next";
import * as Sharing from "expo-sharing";
import { defaultDatabaseDirectory, openDatabaseSync } from "expo-sqlite";
import { ApplicationError, transformError } from "@/lib/result";
import { globalStore } from "@/lib/store/application-state";
import { getDeviceInfo } from "@/lib/api/device";
import { DefaultLogger, LogWriter } from "drizzle-orm/logger";
import Toast from "react-native-toast-message";
import { JobRegistrySelect } from "./db/schema/job-registry";
import { ActivityRegistrySelect } from "./db/schema/activity-registry";
import { TaskRegistrySelect } from "./db/schema/task-registry";
import { WorktimeRegistrySelect } from "./db/schema/worktime-registry";
import { PhotoSelect } from "./db/schema/photos";

export async function exportLogs(
  dumpedState: {
    jobRegistry: JobRegistrySelect[];
    activityRegistry: ActivityRegistrySelect[];
    taskRegistry: TaskRegistrySelect[];
    worktimeRegistry: WorktimeRegistrySelect[];
    photos: PhotoSelect[];
  } | null,
) {
  if (!db) {
    return false;
  }

  exportLogger.info("Exportando logs...");
  exportLogger.verbose(
    "Snapshot del estado de la aplicación",
    globalStore.getState(),
  );

  try {
    if (dumpedState != null) {
      exportLogger.verbose(
        "Información del dispositivo",
        await getDeviceInfo().catch(() => ({})),
      );

      exportLogger.verbose("Cambios pendientes por hacer", dumpedState);
    }

    for (const l of loggers.values()) {
      l.flushWalAll();
    }

    db!.execSync("PRAGMA wal_checkpoint(FULL);");

    exportLogger.flushWalAll();

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
  verbose: 0 as LoggerLevel,
  info: 1 as LoggerLevel,
  warn: 2 as LoggerLevel,
  error: 3 as LoggerLevel,
});

let defaultLevel: LoggerLevel = __DEV__ ? levels.verbose : levels.info;

export type LogEntry = {
  level: LoggerLevel;
  logger: string;
  date: Date;
  message: string;
  object?: any;
};

export class Logger {
  static #stackTrace: string[] = [];

  #name: string;
  #wal: { level: string; logger: string; message: string; object: any }[];
  toastOnWarn: boolean;

  protected constructor(name: string) {
    this.#name = name;
    this.#wal = [];
    this.toastOnWarn = false;
  }

  static getLogger(name: string) {
    if (!loggers.has(name)) {
      loggers.set(name, new Logger(name));
    }
    return loggers.get(name)!;
  }

  static getSQLLogger(name: string) {
    return new DefaultLogger({ writer: new SQLLogger(name) });
  }

  static formatErrorMessage(error: ApplicationError) {
    let msg = `${error.message.trimEnd()}`;
    if ("stackTrace" in error.context) {
      msg += `${error.context.stackTrace}\n`;
    }
    let err = error as Error;
    while (err.cause instanceof Error) {
      msg += `\nCaused by: ${err.cause.message}`;
      if (
        err.cause instanceof ApplicationError &&
        "stackTrace" in err.cause.context
      ) {
        msg += `${err.cause.context.stackTrace}\n`;
      }
      err = err.cause;
    }
    return msg;
  }

  get name() {
    return this.#name;
  }

  #formatMsg(msg: string, obj: any | undefined = undefined) {
    return `[${this.#name}]: ${msg.trimEnd()} ${
      obj !== undefined ? JSON.stringify(obj) : ""
    }`;
  }

  #formatError(error: ApplicationError) {
    let msg = `[${this.#name}]: ${error.message.trimEnd()}`;
    if ("stackTrace" in error.context) {
      msg += `${error.context.stackTrace}\n`;
    }
    let err = error as Error;
    while (err.cause instanceof Error) {
      msg += `\nCaused by: ${err.cause.message}`;
      if (
        err.cause instanceof ApplicationError &&
        "stackTrace" in err.cause.context
      ) {
        msg += `${err.cause.context.stackTrace}\n`;
      }
      err = err.cause;
    }
    return msg;
  }

  #writeDb(level: string, msg: string, obj: any | undefined = undefined) {
    if (!db) {
      return;
    }

    this.#wal.push({
      level,
      logger: this.#name,
      message: msg,
      object: obj ? JSON.stringify(obj) : null,
    });

    if (this.#wal.length <= 10) {
      return;
    }

    this.flushWal();
  }

  static startSubStackTrace(st: string) {
    this.#stackTrace.push(st);
    return () => {
      this.popStackTraceTo(st);
    };
  }

  static pushStackTrace(st: string) {
    this.#stackTrace.push(st);
  }

  static popStackTrace() {
    this.#stackTrace.pop();
  }

  private static popStackTraceTo(target: string) {
    while (this.#stackTrace.length > 0) {
      const s = this.#stackTrace.pop();
      if (s === target) {
        return;
      }
    }
  }

  static get stackTrace() {
    return this.#stackTrace.reduce((acc, s, index) => {
      const indentCh = index === 0 ? "" : "└─ ";
      const indent = index === 0 ? "" : " ".repeat(index);
      return `${acc}\n${indent}${indentCh}${s}`;
    }, "");
  }

  flushWal() {
    try {
      db.withTransactionSync(() => {
        for (const entry of this.#wal) {
          db.runSync(
            "INSERT INTO logs (level, logger, message, object) VALUES (?, ?, ?, ?);",
            entry.level,
            entry.logger,
            entry.message,
            entry.object,
          );
        }
        this.#wal = [];
      });
    } catch {}
  }

  flushWalAll() {
    if (this.#wal.length === 0) {
      return;
    }
    this.flushWal();
  }

  verbose(msg: string, obj: any | undefined = undefined) {
    if (defaultLevel > levels.verbose) {
      return;
    }
    console.log(this.#formatMsg(msg, obj));
    this.#writeDb("VERBOSE", msg, obj);
  }

  warn(msg: string, obj: any | undefined = undefined) {
    if (defaultLevel > levels.warn) {
      return;
    }
    console.log(this.#formatMsg(msg, obj));
    if (this.toastOnWarn) {
      Toast.show({
        type: "warning",
        text1: "Advertencia",
        text2: msg,
        swipeable: true,
        autoHide: true,
      });
    }
    this.#writeDb("WARN", msg, obj);
  }

  error(error: ApplicationError) {
    if (defaultLevel > levels.error) {
      return;
    }
    console.error(this.#formatError(error));
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

  success(msg: string, obj: any | undefined = undefined) {
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

  info(msg: string, obj: any | undefined = undefined) {
    if (defaultLevel > levels.info) {
      return;
    }
    console.log(this.#formatMsg(msg, obj));
    Toast.show({
      type: "info",
      text1: msg,
      swipeable: true,
      autoHide: true,
    });
    this.#writeDb("INFO", msg, obj);
  }
}

class SQLLogger extends Logger implements LogWriter {
  constructor(name: string) {
    super(name);
  }

  write(message: string) {
    this.verbose(message, {});
  }
}

const exportLogger = Logger.getLogger("EXPORT");
export function setGlobalLevel(level: LoggerLevel) {
  defaultLevel = level;
}

const db = openDatabaseSync("logs.db");

const maxLogAge = 86400000; // 1 day
const cutoffTimestamp =
  Math.floor(Date.now() / 1000) - Math.floor(maxLogAge / 1000);
db.execSync(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT,
  logger TEXT,
  date INTEGER DEFAULT (strftime('%s', 'now')),
  message TEXT,
  object TEXT
);
DELETE FROM logs WHERE date < ${cutoffTimestamp};
INSERT INTO logs (level, logger, message) VALUES ('MARKER','MARKER','------ APPLICATION START ------');
`);

setInterval(() => {
  if (!db) return;
  const intervalCutoff =
    Math.floor(Date.now() / 1000) - Math.floor(maxLogAge / 1000);
  db.execSync(`DELETE FROM logs WHERE date < ${intervalCutoff};`);
}, maxLogAge);

export default levels;
