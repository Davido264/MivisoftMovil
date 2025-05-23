import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { jobRegistries_table } from "@/lib/db/schema/job-registry";
import { activityRegistries_table } from "@/lib/db/schema/activity-registry";
import { worktimeRegistries_table } from "@/lib/db/schema/worktime-registry";
import { users_table } from "@/lib/db/schema/user-session";

export const photos_table = sqliteTable(
  "ts_photos",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    userId: integer()
      .notNull()
      .references(() => users_table.id, { onDelete: "cascade" }),
    jobRegistryId: integer()
      .references(() => jobRegistries_table.id, { onDelete: "cascade" })
      .default(sql`NULL`),
    activityRegistryId: integer()
      .references(() => activityRegistries_table.id, { onDelete: "cascade" })
      .default(sql`NULL`),
    worktimeRegistryId: integer()
      .references(() => worktimeRegistries_table.id, { onDelete: "cascade" })
      .default(sql`NULL`),

    uri: text().notNull(),
    name: text().notNull(),
    model: text().notNull(),
    odooId: text().default(sql`null`),
    isSign: integer({ mode: "boolean" }).default(false),
    dirty: integer({ mode: "boolean" }).default(true),
  },
  (table) => [
    index("ts_photos_job_idx").on(table.jobRegistryId),
    index("ts_photos_act_idx").on(table.activityRegistryId),
    index("ts_photos_dirty_idx").on(table.dirty),
    index("ts_photos_dirty_userid_idx").on(table.dirty, table.userId),
  ],
);

export type PhotoSelect = typeof photos_table.$inferSelect;
export type PhotoInsert = typeof photos_table.$inferInsert;
