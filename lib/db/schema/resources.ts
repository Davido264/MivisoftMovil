import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";

export const companies_table = sqliteTable("ts_company", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

export const vehicles_table = sqliteTable(
  "ts_vehicles",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    companyId: integer()
      .notNull()
      .references(() => companies_table.id, { onDelete: "cascade" }),
    name: text().notNull(),
  },
  (table) => [index("ts_vehicle_company_idx").on(table.companyId)],
);

export const itineraries_table = sqliteTable("ts_itinerary", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

export const activities_table = sqliteTable(
  "ts_activity",
  {
    id: integer().primaryKey(),
    itineraryId: integer()
      .notNull()
      .references(() => itineraries_table.id, { onDelete: "cascade" }),

    name: text().notNull(),
  },
  (table) => [index("ts_activity_itineraryidx").on(table.itineraryId)],
);

export const tasks_table = sqliteTable(
  "ts_task",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    activityId: integer()
      .notNull()
      .references(() => activities_table.id, { onDelete: "cascade" }),
  },
  (table) => [index("ts_task_activity_idx").on(table.activityId)],
);

export type CompanyInsert = typeof companies_table.$inferInsert;
export type CompanySelect = typeof companies_table.$inferSelect;

export type VehicleInsert = typeof vehicles_table.$inferInsert;
export type VehicleSelect = typeof vehicles_table.$inferSelect;

export type ItineraryInsert = typeof itineraries_table.$inferInsert;
export type ItinerarySelect = typeof itineraries_table.$inferSelect;

export type ActivityInsert = typeof activities_table.$inferInsert;
export type ActivitySelect = typeof activities_table.$inferSelect;

export type TaskInsert = typeof tasks_table.$inferInsert;
export type TaskSelect = typeof tasks_table.$inferSelect;
