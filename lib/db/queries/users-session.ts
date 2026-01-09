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

export async function getSession(
  userId: number | undefined = undefined,
  scope: Database = db,
) {
  const uid = userId !== undefined ? userId : await getCurrentUserId();
  if (uid == null) {
    return undefined;
  }

  return scope
    .select()
    .from(users_table)
    .where(sql`${users_table.id} = ${uid}`)
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
