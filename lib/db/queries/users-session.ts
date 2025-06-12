import AsyncStorage from "@react-native-async-storage/async-storage";
import { sql } from "drizzle-orm";
import {
  users_table,
  asyncStorageKey,
  OdooSession,
} from "@/lib/db/schema/user-session";
import db, { Database } from "@/lib/db";

export async function getCurrentUserId() {
  return AsyncStorage.getItem(asyncStorageKey).then((i) =>
    i == null ? null : Number(i),
  );
}

export async function getSessionId(userId: number, scope: Database = db) {
  return scope
    .select({ sid: users_table.sid })
    .from(users_table)
    .where(sql`${users_table.id} = ${userId}`)
    .then((e) => (e.length > 0 ? e[0].sid : null));
}

export async function getSession(userId: number, scope: Database = db) {
  return db
    .select()
    .from(users_table)
    .where(sql`${users_table.id} = ${userId}`)
    .then((e) =>
      e.length > 0
        ? ({
            uid: e[0].id,
            name: e[0].name,
            company: e[0].company,
            tz: e[0].tz,
            sid: e[0].sid,
          } as OdooSession)
        : undefined,
    );
}
