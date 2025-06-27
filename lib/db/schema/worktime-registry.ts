import {
  sqliteTable,
  integer,
  text,
  index,
  real,
  unique,
} from "drizzle-orm/sqlite-core";
import { users_table } from "@/lib/db/schema/user-session";
import { sql } from "drizzle-orm";

export const worktimeRegistries_table = sqliteTable(
  "ts_worktime",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    day: integer().notNull(),
    serial: integer().notNull(),
    odooId: integer(),
    userId: integer()
      .notNull()
      .references(() => users_table.id, { onDelete: "cascade" }),

    lastsync: integer({ mode: "timestamp_ms" }),
    lastmod: integer({ mode: "timestamp_ms" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    startDate: integer({ mode: "timestamp_ms" }).notNull(),
    startLat: real().notNull(),
    startLng: real().notNull(),

    endDate: integer({ mode: "timestamp_ms" }),
    endLat: real(),
    endLng: real(),

    observation: text().notNull(),
  },
  (table) => [
    index("ts_worktime_refidx").on(table.day, table.serial),
    index("ts_worktime_userid_idx").on(table.userId),
  ],
);

export const worktime_job_registry_table = sqliteTable(
  "ts_worktime_job_registry",
  {
    day: integer().notNull(),
    jobRegistryId: integer()
      .notNull()
      .references(() => worktimeRegistries_table.id, { onDelete: "cascade" }),
    userId: integer()
      .notNull()
      .references(() => users_table.id, { onDelete: "cascade" }),

    odooJobRegistryId: integer().default(sql`NULL`),
    dirty: integer({ mode: "boolean" })
      .notNull()
      .default(sql`1`),
  },
  (table) => [
    index("ts_worktime_job_registry_worktime_registry_id_idx").on(table.day),
    unique("ts_worktime_job_registry_pk").on(table.jobRegistryId, table.day),
  ],
);

export type WorktimeRegistryInsert =
  typeof worktimeRegistries_table.$inferInsert;
export type WorktimeRegistrySelect =
  typeof worktimeRegistries_table.$inferSelect;
export type WorktimeJobRegistryInsert =
  typeof worktime_job_registry_table.$inferInsert;
export type WorktimeJobRegistrySelect =
  typeof worktime_job_registry_table.$inferSelect;
