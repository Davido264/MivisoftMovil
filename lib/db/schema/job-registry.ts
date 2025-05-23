import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { users_table } from "@/lib/db/schema/user-session";
import {
  companies_table,
  itineraries_table,
  vehicles_table,
} from "@/lib/db/schema/resources";

export const jobRegistries_table = sqliteTable(
  "ts_jobreg",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    odooId: integer()
      .default(sql`NULL`)
      .unique(),
    userId: integer()
      .notNull()
      .references(() => users_table.id, { onDelete: "cascade" }),
    itineraryId: integer()
      .notNull()
      .references(() => itineraries_table.id, { onDelete: "cascade" }),
    vehicleId: integer()
      .notNull()
      .references(() => vehicles_table.id, { onDelete: "cascade" }),
    companyId: integer()
      .notNull()
      .references(() => companies_table.id, { onDelete: "cascade" }),

    lastsync: integer({ mode: "timestamp_ms" }),
    lastmod: integer({ mode: "timestamp_ms" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    priority: integer({ mode: "timestamp_ms" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    startDate: integer({ mode: "timestamp_ms" }).notNull(),
    endDate: integer({ mode: "timestamp_ms" }).default(sql`NULL`),
    score: integer().default(sql`NULL`),
    observation: text().notNull(),
  },
  (table) => [
    index("ts_jobreg_server_idx").on(table.odooId),
    index("ts_jobreg_company_idx").on(table.companyId),
    index("ts_jobreg_vehicle_idx").on(table.vehicleId),
    index("ts_jobreg_lastmod_idx").on(table.vehicleId),
    index("ts_jobreg_user_idx").on(table.userId),
  ],
);

export type JobRegistryInsert = typeof jobRegistries_table.$inferInsert;
export type JobRegistrySelect = typeof jobRegistries_table.$inferSelect;
