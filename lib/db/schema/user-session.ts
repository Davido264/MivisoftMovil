import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const asyncStorageKey = "technical_support::current_session";

export const users_table = sqliteTable("ts_users", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  tz: text(),
  company: text(),
  sid: text(),
});

export type OdooSession = {
  uid: number;
  name: string;
  company: string;
  tz: string;

  sid: string;
};

export type UserInsert = typeof users_table.$inferInsert;
export type UserSelect = typeof users_table.$inferSelect;
