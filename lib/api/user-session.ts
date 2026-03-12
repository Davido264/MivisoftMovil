import { persist, removeUserSession } from "@/lib/db/actions/users-session";
import { getSession } from "@/lib/db/queries/users-session";
import { Logger } from "@/lib/logger";
import { ApplicationError, transformError } from "@/lib/result";
import { OdooSession } from "@/lib/db/schema/user-session";
import { globalStore } from "@/lib/store/application-state";
import { syncAll } from "@/lib/api/sync";
import { odoo } from "../odoo/env";

const logger = Logger.getLogger("API::USER-SESSION");

export async function restoreSession() {
  const pop = Logger.startSubStackTrace("api::restoreSession");
  try {
    logger.verbose("Obteniendo la sesión actual");
    const session = await getSession();

    if (session == null) {
      logger.verbose("No hay sesión iniciada registrada para el usuario");
      return undefined;
    }

    const validatedSession = await Promise.race([
      checkSession(session),
      resolveFallbackAfter(session, 10_000),
    ]);

    console.log(validatedSession);

    try {
      return validatedSession || session;
    } catch (error) {
      const err = transformError(
        error,
        "Error restaurando o validando la sesión",
        { stackTrace: Logger.stackTrace },
      );

      if (err.type === "NetworkError") {
        logger.warn(
          "Error de red al validar la sesión. Cargando sesión desde almacenamiento local",
        );
        return session;
      }

      throw err;
    }
  } finally {
    pop();
  }
}

export async function login(username: string, password: string) {
  const pop = Logger.startSubStackTrace("api::login");
  try {
    const result = await checkSession({ username }, password);
    console.log(result);
    await persist(result);
    globalStore.setState({ sessionData: result });

    queueMicrotask(() => syncAll(true));

    return true;
  } catch (e) {
    const err = transformError(e, "Error al iniciar sesión", {
      username,
      password: "Creiste que era una contraseña... pero era yo! DIO!!!! >:D",
      stackTrace: Logger.stackTrace,
    });

    if (isCredentials(err)) {
      logger.warn("Inicio de sesión fallido");
      return false;
    }

    logger.error(err);
    return false;
  } finally {
    pop();
  }
}

export async function logout() {
  const { sessionData } = globalStore.getState();
  if (sessionData == null) {
    return;
  }

  try {
    removeUserSession(sessionData.uid);
  } catch (error) {
    logger.error(
      transformError(error, "Error al cerrar sesión", {
        sessionData,
      }),
    );
  }

  globalStore.setState({
    sessionData: null,
    pendingChanges: 0,
    conflicts: 0,
  });
}

async function checkSession(
  sessionData: OdooSession | { username: string },
  password?: string,
) {
  const cred =
    "sid" in sessionData
      ? { sessionId: sessionData.sid }
      : { username: sessionData.username, password: password! };

  const { usr, sessionId } = await odoo.connect(cred);

  const timezone = usr.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    uid: usr.id,
    name: usr.name,
    company: usr.company.name,
    sid: sessionId,
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

function isCredentials(error: ApplicationError) {
  return error.type === "InvalidCredentials" || error.type === "SessionExpired";
}
