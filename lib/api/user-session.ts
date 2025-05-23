import { persist, removeUserSession } from "@/lib/db/actions/users-session";
import {
  getCurrentUserId,
  getSessionId,
  getSession,
} from "@/lib/db/queries/users-session";
import { Logger } from "@/lib/logger";
import { ApplicationError, attemptAsync } from "@/lib/result";
import OdooJSONRpc, {
  OdooAuthenticateWithCredentialsResponse,
} from "@fernandoslim/odoo-jsonrpc";
import { OdooSession } from "@/lib/db/schema/user-session";
import { globalStore } from "@/lib/store/application-state";
import { syncAll } from "@/lib/api/sync";

const logger = Logger.getLogger("API::USER-SESSION");

export async function restoreAndValidateSession() {
  logger.info("Obteniendo la sesión actual");
  const { data: userId, error: userError } = await attemptAsync(() =>
    getCurrentUserId(),
  );

  if (userError != null) {
    logger.error("Error obteniendo el usuario actual", userError);
    globalStore.setState({ lastError: userError });
    return;
  }

  if (userId == null) {
    logger.info("No hay sesión iniciada registrada");
    return;
  }

  const { data: sessionId, error: sessionError } = await attemptAsync(() =>
    getSessionId(userId),
  );

  if (sessionError != null) {
    logger.error("Error obteniendo la sesión actual");
    globalStore.setState({ lastError: sessionError });
    return;
  }

  if (sessionId == null) {
    logger.info("No hay sesión iniciada registrada para el usuario");
    return;
  }

  const client = createClient(sessionId);
  const raced = await Promise.race([
    attemptAsync(() => checkSession(client)),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 10000)),
  ]);

  if (typeof raced === "boolean") {
    logger.warn("Se alcanzó el timeout antes de completar la solicitud", {
      tiemout: 10000,
    });
    await loadLocalSession(userId);
    return;
  }

  if (raced.error != null) {
    logger.warn("Error al validar la sesión", raced.error);
    const error = raced.error;
    if (error.type === "NetworkError") {
      logger.warn(
        "Error de red al validar la sesión. Cargando sesión desde almacenamiento local",
      );
      await loadLocalSession(userId);
      return;
    }

    if (isCredentials(error)) {
      logger.warn("Sesión expirada");
      return;
    }

    globalStore.setState({ lastError: raced.error });
    return;
  }

  logger.info("Sesión validada correctamente");
  const { error } = await attemptAsync(() => persist(raced.data));

  if (error != null) {
    logger.error("Error almacenando la sesión", error);
    globalStore.setState({ lastError: error });
    return;
  }

  globalStore.setState({ sessionData: raced.data, odooClient: client });
}

export async function login(username: string, password: string) {
  const client = createClientFromCredentials(username, password);
  const { data, error } = await attemptAsync(() => checkSession(client));
  if (error != null) {
    if (isCredentials(error)) {
      logger.error("Inicio de sesión fallido");
      return false;
    }
    logger.error("Error iniciando sesión", error);
    globalStore.setState({ lastError: error });
    return true;
  }

  const { error: error2 } = await attemptAsync(() => persist(data));
  if (error2 != null) {
    logger.error("Error guardando sesión", error2);
    globalStore.setState({ lastError: error2 });
    return true;
  }

  globalStore.setState({ sessionData: data, odooClient: client });
  queueMicrotask(() => syncAll(true));
  return true;
}

export async function checkAndStore() {
  const { sessionData, odooClient } = globalStore.getState();
  if (sessionData == null || odooClient == null) {
    return;
  }

  logger.info("Verificando y almacenando la sesión...");
  const { data: session, error } = await attemptAsync(() =>
    checkSession(odooClient),
  );
  if (error != null) {
    if (isCredentials(error)) {
      logger.warn("La sesión ya no es válida");
      globalStore.setState({ sessionData: null, odooClient: null });
      return;
    }
    globalStore.setState({ lastError: error });
    return;
  }

  const { error: error2 } = await attemptAsync(async () => {
    await persist(session);
    globalStore.setState({ sessionData: session });
  });

  if (error2 != null) {
    logger.error("Error al almacenar la sesión");
    globalStore.setState({ lastError: error2 });
  }
}

export async function logout() {
  const { sessionData, odooClient } = globalStore.getState();
  if (sessionData == null || odooClient == null) {
    return;
  }

  const { error } = await attemptAsync(() =>
    odooClient.disconnect().finally(() => removeUserSession(sessionData.uid)),
  );

  if (error != null) {
    logger.error("Error al cerrar sesión", error);
    globalStore.setState({ lastError: error });
    return;
  }

  globalStore.setState({
    sessionData: null,
    odooClient: null,
    pendingChanges: 0,
    conflicts: 0,
  });
}

export async function checkSession(connector: OdooJSONRpc) {
  const session = await connector.connect();

  const s = session as OdooAuthenticateWithCredentialsResponse;

  const timezone =
    s.user_context.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    uid: s.uid,
    name: s.name,
    company:
      s.user_companies.allowed_companies?.[s.user_companies.current_company]
        ?.name ?? "",
    sid: connector.sessionId,
    tz: timezone,
  } as OdooSession;
}

function createClientFromCredentials(username: string, password: string) {
  return new OdooJSONRpc({
    ...odooConf,
    username,
    password,
  });
}

function createClient(sessionId: string) {
  return new OdooJSONRpc({
    ...odooConf,
    sessionId: sessionId,
  });
}

function isCredentials(error: ApplicationError) {
  return error.type === "InvalidCredentials" || error.type === "SessionExpired";
}

async function loadLocalSession(userId: number) {
  const { data, error } = await attemptAsync(() => getSession(userId));
  if (error != null) {
    logger.error("Error al obtener sesión local", error);
    globalStore.setState({ lastError: error });
    return;
  }
  globalStore.setState({
    sessionData: data,
    odooClient: data ? createClient(data.sid) : undefined,
  });
}

const odooConf = {
  baseUrl: "https://its.mivilsoft.com",
  port: 443,
  db: "QuitoOdooDB",
};
