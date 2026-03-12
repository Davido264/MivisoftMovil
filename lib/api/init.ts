import migrations from "@/drizzle/migrations";
import { syncAll } from "@/lib/api/sync";
import { restoreSession } from "@/lib/api/user-session";
import db from "@/lib/db";
import { countPending } from "@/lib/db/queries/utils";
import { Logger } from "@/lib/logger";
import { transformError } from "@/lib/result";
import { globalStore } from "@/lib/store/application-state";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { SplashScreen } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { persist } from "../db/actions/users-session";

const initLogger = Logger.getLogger("API::INIT");
const logger = Logger.getLogger("APP");

export async function init() {
  const pop = Logger.startSubStackTrace("api::init");
  try {
    await migrate(db, migrations);
  } catch (e) {
    const err = transformError(e, "Error de migración de base de datos", {
      stackTrace: Logger.stackTrace,
    });
    initLogger.error(err);
    pop();
    return err.message;
  }

  initLogger.verbose("Migraciones de base de datos aplicadas correctamente");
  initLogger.verbose("Iniciando sesión...");

  try {
    const session = await restoreSession();
    if (session) {
      await persist(session);
      globalStore.setState({ sessionData: session });
    }
  } catch (e) {
    logger.error(
      transformError(e, "Error restaurando o validando la sesión", {
        stackTrace: Logger.stackTrace,
      }),
    );
  }

  const userId = globalStore.getState().sessionData?.uid;

  globalStore.setState({
    isOnline: await getNetworkStateAsync()
      .then((r) => r.isInternetReachable)
      .catch(() => null),
    conflicts: 0,
    pendingChanges:
      userId == null ? 0 : await countPending(userId).catch(() => 0),
  });

  queueMicrotask(() => syncAll(true));
  pop();
  return undefined;
}

export function useInit() {
  const [ok, setOk] = useState(true);
  const [loading, setLoading] = useState(true);

  const [fontLoaded, fontError] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (fontError) {
      setOk(false);
      initLogger.error(transformError(fontError, "Error al cargar fuentes"));
      return;
    }

    init()
      .then((o) => {
        setOk(o === undefined);
      })
      .then(SplashScreen.hideAsync)
      .finally(() => setLoading(false));

    const networkSubscription = addNetworkStateListener(async (_) => {
      const isOnline = await getNetworkStateAsync()
        .then((r) => r.isInternetReachable)
        .catch(() => null);

      globalStore.setState({ isOnline });

      if (isOnline === true) {
        syncAll(true);
      }
    });

    const memoryWarningEventSubscription = AppState.addEventListener(
      "memoryWarning",
      () => {
        logger.warn("Consumo de memoria alta");
      },
    );

    return () => {
      networkSubscription.remove();
      memoryWarningEventSubscription.remove();
    };
  }, [fontError]);

  return [ok, loading && !fontLoaded] as [true, boolean] | [false, boolean];
}
