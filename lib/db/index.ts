import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as $1 from "@/lib/db/schema/resources";
import * as $2 from "@/lib/db/schema/user-session";
import * as $3 from "@/lib/db/schema/worktime-registry";
import * as $4 from "@/lib/db/schema/job-registry";
import * as $5 from "@/lib/db/schema/activity-registry";
import * as $6 from "@/lib/db/schema/task-registry";
import * as $7 from "@/lib/db/schema/photos";

const schema = { ...$1, ...$2, ...$3, ...$4, ...$5, ...$6, ...$7 };

const _expoAppConnection = openDatabaseSync(
  "com.mivilsoft.techcnicalSupport.db",
  {
    enableChangeListener: true,
  },
);
const transBehavior = "deferred";

_expoAppConnection.runSync("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");

const db = drizzle(_expoAppConnection, { schema });

export type Database =
  | typeof db
  | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export default db;

export { _expoAppConnection, transBehavior };
