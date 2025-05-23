import { defaultDatabaseDirectory, openDatabaseSync } from "expo-sqlite";
import * as Sharing from "expo-sharing";
import { attempt, attemptAsync } from "./result";
import { Paths, File } from "expo-file-system/next";
import { globalStore } from "./store/application-state";

export async function exportLogs() {
  if (!db) {
    return false;
  }

  await exportLogger.info("Exportando logs...");
  await exportLogger.info("Snapshot del estado de la aplicacióñ", {
    ...globalStore.getState(),
    odooCient: {},
  });
  const { error: transError } = await attempt(() =>
    db!.execSync("PRAGMA wal_checkpoint(FULL);"),
  );

  if (transError != null) {
    globalStore.setState({ lastError: transError });
    return false;
  }

  const isAvailableResult = await attemptAsync(() =>
    Sharing.isAvailableAsync(),
  );

  if (isAvailableResult.error != null) {
    globalStore.setState({ lastError: isAvailableResult.error });
    return false;
  }

  if (!isAvailableResult.data) {
    return false;
  }

  const file = new File(
    `file://${Paths.join(defaultDatabaseDirectory, "logs.db")}`,
  );

  const shareResult = await attemptAsync(() =>
    Sharing.shareAsync(file.uri, {
      mimeType: "application/x-sqlite3",
      dialogTitle: "Exportar logs",
    }),
  );

  attempt(() => file.delete());
  console.log("shareResult", shareResult);
  if (shareResult.error != null) {
    globalStore.setState({ lastError: shareResult.error });
    return false;
  }

  return shareResult.error == null;
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
DELETE FROM logs;
`);

export default levels;
