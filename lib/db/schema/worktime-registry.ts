import {
  sqliteTable,
  integer,
  text,
  index,
  real,
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
    endLat: real().notNull(),
    endLng: real().notNull(),

    observation: text().notNull(),
  },
  (table) => [
    index("ts_worktime_refidx").on(table.day, table.serial),
    index("ts_worktime_userid_idx").on(table.userId),
  ],
);

export type WorktimeRegistryInsert =
  typeof worktimeRegistries_table.$inferInsert;
export type WorktimeRegistrySelect =
  typeof worktimeRegistries_table.$inferSelect;
