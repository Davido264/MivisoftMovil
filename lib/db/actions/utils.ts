import db, { Database } from "@/lib/db";
import { photos_table } from "@/lib/db/schema/photos";
import { jobRegistries_table } from "@/lib/db/schema/job-registry";
import { worktimeRegistries_table } from "@/lib/db/schema/worktime-registry";
import {
  companies_table,
  vehicles_table,
  itineraries_table,
} from "@/lib/db/schema/resources";
import { users_table } from "@/lib/db/schema/user-session";
import { removeSessions } from "@/lib/db/actions/users-session";

export function dateObj(sync: boolean) {
  const date = new Date();
  return sync ? { lastmod: date, lastsync: date } : { lastmod: date };
}

// ponytail: un registro local tiene cambios SIN subir cuando fue modificado
// después del último sync (lastmod > lastsync) o nunca se sincronizó (lastsync
// null). En la reconciliación de descarga NO debe pisarse: gana lo local y se
// subirá en el próximo sync (esta es la semántica de "cola" — local-first).
export function hasLocalChanges(row: {
  lastmod: Date | null;
  lastsync: Date | null;
}): boolean {
  if (row.lastsync == null) return true;
  if (row.lastmod == null) return false;
  return row.lastmod.getTime() > row.lastsync.getTime();
}

export async function purgeStorage(scope: Database = db) {
  return scope.transaction(async (tx) => {
    await db.delete(worktimeRegistries_table);
    await db.delete(jobRegistries_table);
    await db.delete(photos_table);

    await db.delete(users_table);

    await db.delete(itineraries_table);
    await db.delete(companies_table);
    await db.delete(vehicles_table);

    // the rest will be deleted by the cascade

    await removeSessions();
  });
}
