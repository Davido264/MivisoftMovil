import { persist, removeUserSession } from "@/lib/db/actions/users-session";
import { getSession } from "@/lib/db/queries/users-session";
import { Logger } from "@/lib/logger";
import { ApplicationError, transformError } from "@/lib/result";
import { OdooSession } from "@/lib/db/schema/user-session";
import { globalStore } from "@/lib/store/application-state";
import { syncAll } from "@/lib/api/sync";
import { odoo } from "../odoo/env";

const logger = Logger.getLogger("API::USER-SESSION");

// ponytail: 30s da margen a Odoo lento; el fallback local cubre el resto
const SESSION_TIMEOUT = 30_000;

export async function restoreSession() {
  const pop = Logger.startSubStackTrace("api::restoreSession");
  try {
    logger.verbose("Obteniendo la sesión actual");
    const session = await getSession();

    if (session == null) {
      logger.verbose("No hay sesión iniciada registrada para el usuario");
      return undefined;
    }

    const endpoint = `${odoo.baseUrl}/web/session/get_session_info`;
    const started = Date.now();
    logger.verbose("Validando sesión contra Odoo", {
      endpoint,
      uid: session.uid,
      sid: session.sid ? `${session.sid.slice(0, 6)}…` : null,
    });

    // ponytail: la lib de Odoo hace fetch SIN timeout; esta promesa puede quedar
    // colgada tras el race. La instrumentamos para que registre su resultado
    // real (status/duración/error) aunque el fallback ya haya ganado.
    const validate = checkSession(session)
      .then((s) => {
        logger.info("Sesión validada", { endpoint, ms: Date.now() - started });
        return s;
      })
      .catch((error) => {
        const err = transformError(error, "Falló la validación de sesión", {
          endpoint,
          ms: Date.now() - started,
          stackTrace: Logger.stackTrace,
        });
        logger.warn("Falló la validación de sesión", {
          endpoint,
          ms: Date.now() - started,
          type: err.type,
          message: err.message,
        });

        if (err.type === "NetworkError") {
          return session;
        }

        throw err;
      });

    // ponytail: timer cancelable; sin clearTimeout el warning de timeout se
    // disparaba SIEMPRE a los 30s aunque la sesión validara en ms.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fallback = new Promise<OdooSession>((resolve) => {
      timer = setTimeout(() => {
        logger.warn("Se alcanzó el timeout antes de completar la solicitud", {
          timeout: SESSION_TIMEOUT,
          endpoint,
        });
        resolve(session);
      }, SESSION_TIMEOUT);
    });

    try {
      const validatedSession = await Promise.race([validate, fallback]);
      return validatedSession || session;
    } finally {
      clearTimeout(timer);
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

function isCredentials(error: ApplicationError) {
  return error.type === "InvalidCredentials" || error.type === "SessionExpired";
}
