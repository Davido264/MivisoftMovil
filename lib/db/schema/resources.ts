import {
  sqliteTable,
  integer,
  text,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

export const companies_table = sqliteTable("ts_company", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
});

export const vehicles_table = sqliteTable("ts_vehicles", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  companyId: integer()
});

export const vehicles_companies_table = sqliteTable(
  "ts_vehicles_companies",
  {
    vehicleId: integer()
      .notNull()
      .references(() => vehicles_table.id, { onDelete: "cascade" }),
    companyId: integer()
      .notNull()
      .references(() => companies_table.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("ts_vehicles_companies_vehicleid_idx").on(table.vehicleId),
    index("ts_vehicles_companies_companyid_idx").on(table.companyId),
    unique("ts_vehicles_companies_companyid_vehicleid_idx").on(
      table.companyId,
      table.vehicleId,
    ),
  ],
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

export type VehicleCompanyInsert = typeof vehicles_companies_table.$inferInsert;

export type ItineraryInsert = typeof itineraries_table.$inferInsert;
export type ItinerarySelect = typeof itineraries_table.$inferSelect;

export type ActivityInsert = typeof activities_table.$inferInsert;
export type ActivitySelect = typeof activities_table.$inferSelect;

export type TaskInsert = typeof tasks_table.$inferInsert;
export type TaskSelect = typeof tasks_table.$inferSelect;
