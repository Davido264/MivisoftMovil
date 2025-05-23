import AsyncStorage from "@react-native-async-storage/async-storage";
import db, { Database } from "@/lib/db";
import { OdooSession, users_table } from "@/lib/db/schema/user-session";
import { sql } from "drizzle-orm";
import { Logger } from "@/lib/logger";
import { getCurrentUserId } from "@/lib/db/queries/users-session";
import { RemoteUser } from "@/lib/odoo/users";

const asyncStorageKey = "technical_support::current_session";

const logger = Logger.getLogger("STORAGE::USERS-SESSION");

export async function removeSessions(scope: Database = db) {
  return scope
    .select({ uid: users_table.id })
    .from(users_table)
    .then((uids) =>
      scope
        .update(users_table)
        .set({ sid: "" })
        .where(sql`${users_table.id} IN ${uids}`),
    )
    .then((_) => AsyncStorage.removeItem(asyncStorageKey));
}

export async function removeUserSession(userId: number, scope: Database = db) {
  const currentSessionId = await getCurrentUserId();

  scope
    .update(users_table)
    .set({ sid: "" })
    .where(sql`${users_table.id} = ${userId}`);

  if (currentSessionId === userId) {
    await AsyncStorage.removeItem(asyncStorageKey);
  }

  if (currentSessionId === userId) {
    throw {
      type: "SessionExpired",
      message: "Sesión eliminada del almacenamiento",
    };
  }
}

export async function persist(session: OdooSession, scope: Database = db) {
  logger.info("Persistiendo sesión actual");
  const updateObj = {
    name: session.name,
    company: session.company,
    tz: session.tz,
    sid: session.sid,
  };

  await scope
    .insert(users_table)
    .values({
      id: session.uid,
      ...updateObj,
    })
    .onConflictDoUpdate({ target: users_table.id, set: updateObj })
    .then((_) => AsyncStorage.setItem(asyncStorageKey, `${session.uid}`));

  await AsyncStorage.setItem(asyncStorageKey, `${session.uid}`);
}

export async function upsertRemoteUsers(u: RemoteUser[], scope: Database = db) {
  return scope
    .insert(users_table)
    .values(u.map(({ id, name, tz, company }) => ({ id, name, tz, company })))
    .onConflictDoUpdate({
      target: users_table.id,
      set: {
        name: sql`excluded.name`,
        tz: sql`excluded.tz`,
        company: sql`excluded.company`,
      },
    });
}

export async function deleteNonRemoteUsers(
  existingUserIds: number[],
  scope: Database = db,
) {
  const currentUserId = await getCurrentUserId();
  if (currentUserId != null && !existingUserIds.includes(currentUserId)) {
    logger.warn("Se va a elminar la sesión del usuario actual");
    return currentUserId;
  }

  await scope
    .delete(users_table)
    .where(
      sql`${users_table.id} NOT IN ${existingUserIds}`,
    );
  return undefined;
}
