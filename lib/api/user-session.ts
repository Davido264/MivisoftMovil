import { persist, removeUserSession } from "@/lib/db/actions/users-session";
import { getSession } from "@/lib/db/queries/users-session";
import { Logger } from "@/lib/logger";
import { ApplicationError, transformError } from "@/lib/result";
import OdooJSONRpc, {
  OdooAuthenticateWithCredentialsResponse,
} from "@fernandoslim/odoo-jsonrpc";
import { OdooSession } from "@/lib/db/schema/user-session";
import { globalStore } from "@/lib/store/application-state";
import { syncAll } from "@/lib/api/sync";

const logger = Logger.getLogger("API::USER-SESSION");

export async function restoreSession() {
  logger.verbose("Obteniendo la sesión actual");
  const session = await getSession();

  if (session == null) {
    logger.verbose("No hay sesión iniciada registrada para el usuario");
    return [undefined, undefined] as const;
  }

  const client = createClient(session.sid);

  try {
    return [
      await Promise.race([
        checkSession(client),
        resolveFallbackAfter(session, 10_000),
      ]),
      client,
    ] as const;
  } catch (error) {
    const err = transformError(
      error,
      "Error restaurando o validando la sesión",
    );

    if (err.type === "NetworkError") {
      logger.warn(
        "Error de red al validar la sesión. Cargando sesión desde almacenamiento local",
      );
      return [session, client] as const;
    }

    throw err;
  }
}

export async function login(username: string, password: string) {
  const client = createClientFromCredentials(username, password);

  try {
    const result = await checkSession(client);
    await persist(result);
    globalStore.setState({ sessionData: result, odooClient: client });

    queueMicrotask(() => syncAll(true));

    return true;
  } catch (e) {
    const err = transformError(e, "Error al iniciar sesión", {
      username,
      password: "Creiste que era una contraseña... pero era yo! DIO!!!! >:D",
    });

    if (isCredentials(err)) {
      logger.warn("Inicio de sesión fallido");
      return false;
    }

    logger.error(err);
    return false;
  }
}

export async function logout() {
  const { sessionData, odooClient } = globalStore.getState();
  if (sessionData == null || odooClient == null) {
    return;
  }

  try {
    odooClient.disconnect().finally(() => removeUserSession(sessionData.uid));
  } catch (error) {
    logger.error(
      transformError(error, "Error al cerrar sesión", {
        sessionData,
      }),
    );
  }

  globalStore.setState({
    sessionData: null,
    odooClient: null,
    pendingChanges: 0,
    conflicts: 0,
  });
}

async function checkSession(connector: OdooJSONRpc) {
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

async function resolveFallbackAfter(
  fallbackSession: OdooSession,
  timeout: number,
) {
  return new Promise<OdooSession>((resolve) =>
    setTimeout(() => {
      logger.warn("Se alcanzó el timeout antes de completar la solicitud", {
        tiemout: 10000,
      });
      resolve(fallbackSession);
    }, timeout),
  );
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

const odooConf = {
  baseUrl: "https://its.mivilsoft.com",
  port: 443,
  db: "QuitoOdooDB",
};
