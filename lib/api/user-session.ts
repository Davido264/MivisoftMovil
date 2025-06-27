import { persist, removeUserSession } from "@/lib/db/actions/users-session";
import {
  getCurrentUserId,
  getSessionId,
  getSession,
} from "@/lib/db/queries/users-session";
import { Logger } from "@/lib/logger";
import { ApplicationError, transformError } from "@/lib/result";
import OdooJSONRpc, {
  OdooAuthenticateWithCredentialsResponse,
} from "@fernandoslim/odoo-jsonrpc";
import { OdooSession } from "@/lib/db/schema/user-session";
import { globalStore } from "@/lib/store/application-state";
import { syncAll } from "@/lib/api/sync";
import { ResultAsync } from "neverthrow";

const logger = Logger.getLogger("API::USER-SESSION");

export async function restoreAndValidateSession() {
  logger.info("Obteniendo la sesión actual");
  const result = await ResultAsync.fromPromise(getCurrentUserId(), (e) =>
    transformError(e, "Error obteniendo el usuario actual"),
  );

  if (result.isErr()) {
    globalStore.setState({ lastError: result.error });
    return;
  }

  if (result.value == null) {
    logger.info("No hay sesión iniciada registrada");
    return;
  }

  const sessionResult = await ResultAsync.fromPromise(
    getSessionId(result.value),
    (e) =>
      transformError(e, "Error obteniendo la sesión actual", {
        userId: result.value,
      }),
  );

  if (sessionResult.isErr()) {
    globalStore.setState({ lastError: sessionResult.error });
    return;
  }

  if (sessionResult.value == null) {
    logger.info("No hay sesión iniciada registrada para el usuario");
    return;
  }

  const client = createClient(sessionResult.value);
  const raced = await Promise.race([
    ResultAsync.fromPromise(checkSession(client), (e) =>
      transformError(e, "Error al validar la sesión con odoo"),
    ),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 10000)),
  ]);

  if (typeof raced === "boolean") {
    logger.warn("Se alcanzó el timeout antes de completar la solicitud", {
      tiemout: 10000,
    });
    await loadLocalSession(result.value);
    return;
  }

  if (raced.isErr()) {
    logger.warn("Error al validar la sesión", raced.error);
    const error = raced.error;
    if (error.type === "NetworkError") {
      logger.warn(
        "Error de red al validar la sesión. Cargando sesión desde almacenamiento local",
      );
      await loadLocalSession(result.value);
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
  const persistResult = await ResultAsync.fromPromise(
    persist(raced.value),
    (e) =>
      transformError(e, "Error al guardar la sesión", { session: raced.value }),
  );

  if (persistResult.isErr()) {
    globalStore.setState({ lastError: persistResult.error });
    return;
  }

  globalStore.setState({ sessionData: raced.value, odooClient: client });
}

export async function login(username: string, password: string) {
  const client = createClientFromCredentials(username, password);
  const result = await ResultAsync.fromPromise(checkSession(client), (e) =>
    transformError(e, "Error al iniciar sesión", {
      username,
      password: "Creiste que era una contraseña... pero era yo! DIO!!!! >:D",
    }),
  );

  if (result.isErr()) {
    if (isCredentials(result.error)) {
      logger.warn("Inicio de sesión fallido");
      return false;
    }
    globalStore.setState({ lastError: result.error });
    return true;
  }

  const persistResult = await ResultAsync.fromPromise(
    persist(result.value),
    (e) =>
      transformError(e, "Error al guardar la sesión", {
        session: result.value,
      }),
  );
  if (persistResult.isErr()) {
    globalStore.setState({ lastError: persistResult.error });
    return true;
  }

  globalStore.setState({ sessionData: result.value, odooClient: client });
  queueMicrotask(() => syncAll(true));
  return true;
}

export async function checkAndStore() {
  const { sessionData, odooClient } = globalStore.getState();
  if (sessionData == null || odooClient == null) {
    return;
  }

  logger.info("Verificando y almacenando la sesión...");
  const result = await ResultAsync.fromPromise(checkSession(odooClient), (e) =>
    transformError(e, "Error al validar la sesión con odoo"),
  );
  if (result.isErr()) {
    if (isCredentials(result.error)) {
      logger.warn("La sesión ya no es válida");
      globalStore.setState({ sessionData: null, odooClient: null });
      return;
    }
    globalStore.setState({ lastError: result.error });
    return;
  }

  const persistResult = await ResultAsync.fromPromise(
    persist(result.value),
    (e) =>
      transformError(e, "Error al almacenar la sesión", {
        session: result.value,
      }),
  );

  if (persistResult.isErr()) {
    globalStore.setState({ lastError: persistResult.error });
    return;
  }

  globalStore.setState({ sessionData: result.value });
}

export async function logout() {
  const { sessionData, odooClient } = globalStore.getState();
  if (sessionData == null || odooClient == null) {
    return;
  }

  const result = await ResultAsync.fromPromise(
    odooClient.disconnect().finally(() => removeUserSession(sessionData.uid)),
    (e) =>
      transformError(e, "Error al cerrar sesión", {
        sessionData,
      }),
  );

  if (result.isErr()) {
    globalStore.setState({ lastError: result.error });
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
  const result = await ResultAsync.fromPromise(getSession(userId), (e) =>
    transformError(e, "Error al obtener sesión local", { userId }),
  );
  if (result.isErr()) {
    globalStore.setState({ lastError: result.error });
    return;
  }
  globalStore.setState({
    sessionData: result.value,
    odooClient: result.value ? createClient(result.value.sid) : undefined,
  });
}

const odooConf = {
  baseUrl: "https://its.mivilsoft.com",
  port: 443,
  db: "QuitoOdooDB",
};
