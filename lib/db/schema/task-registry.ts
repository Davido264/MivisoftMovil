import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import { activityRegistries_table } from "@/lib/db/schema/activity-registry";
import { tasks_table } from "@/lib/db/schema/resources";
import { users_table } from "@/lib/db/schema/user-session";

export const taskRegistries_table = sqliteTable(
  "ts_taskreg",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    odooId: integer()
      .default(sql`NULL`)
      .unique(),
    userId: integer()
      .notNull()
      .references(() => users_table.id, { onDelete: "cascade" }),
    activityRegistryId: integer()
      .notNull()
      .references(() => activityRegistries_table.id, { onDelete: "cascade" }),
    taskId: integer()
      .notNull()
      .references(() => tasks_table.id, { onDelete: "cascade" }),

    lastsync: integer({ mode: "timestamp_ms" }),
    lastmod: integer({ mode: "timestamp_ms" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    completedDate: integer({ mode: "timestamp_ms" }),
    completed: integer({ mode: "boolean" }).notNull().default(false),
    observation: text().notNull(),
  },
  (table) => [
    index("ts_taskreg_serveridx").on(table.odooId),
    index("ts_taskreg_jobregidx").on(table.activityRegistryId),
    index("ts_taskreg_taskidx").on(table.taskId),
    index("ts_taskreg_userid").on(table.userId),
    unique().on(table.activityRegistryId, table.taskId),
  ],
);

export type TaskRegistryInsert = typeof taskRegistries_table.$inferInsert;
export type TaskRegistrySelect = typeof taskRegistries_table.$inferSelect;
