import db, { Database } from "@/lib/db";
import { companies_table, vehicles_table } from "@/lib/db/schema/resources";
import { sql } from "drizzle-orm";

export function getAllCompanies(scope: Database = db) {
  return scope.select().from(companies_table);
}

export function getAllVehicles(companyId: number, scope: Database = db) {
  const condition =
    companyId === 0 ? sql`1` : sql`${vehicles_table.companyId} = ${companyId}`;

  return db.select().from(vehicles_table).where(condition);
}
