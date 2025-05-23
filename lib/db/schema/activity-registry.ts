import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  index,
  unique,
  real,
} from "drizzle-orm/sqlite-core";
import { jobRegistries_table } from "@/lib/db/schema/job-registry";
import { activities_table } from "@/lib/db/schema/resources";
import { users_table } from "./user-session";

export const activityRegistries_table = sqliteTable(
  "ts_actreg",
  {
    id: integer().primaryKey({ autoIncrement: true }),

    odooId: integer()
      .default(sql`NULL`)
      .unique(),
    userId: integer()
      .notNull()
      .references(() => users_table.id, { onDelete: "cascade" }),
    jobRegistryId: integer().references(() => jobRegistries_table.id, {
      onDelete: "cascade",
    }),
    activityId: integer()
      .notNull()
      .references(() => activities_table.id, { onDelete: "cascade" }),

    lastsync: integer({ mode: "timestamp_ms" }),
    lastmod: integer({ mode: "timestamp_ms" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    lat: real().notNull(),
    lng: real().notNull(),
    observation: text()
      .notNull()
      .default(sql`NULL`),
  },
  (table) => [
    index("ts_actreg_odooidx").on(table.odooId),
    index("ts_actreg_jobregidx").on(table.jobRegistryId),
    index("ts_actreg_actidx").on(table.activityId),
    index("ts_actreg_act_jobregidx").on(table.activityId, table.jobRegistryId),
    index("ts_actreg_lastmodidx").on(table.lastmod),
    index("ts_photos_userid").on(table.userId),
    unique().on(table.jobRegistryId, table.activityId),
  ],
);

export type ActivityRegistryInsert =
  typeof activityRegistries_table.$inferInsert;
export type ActivityRegistrySelect =
  typeof activityRegistries_table.$inferSelect;
