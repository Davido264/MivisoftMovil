import migrations from "@/drizzle/migrations";
import { syncAll } from "@/lib/api/sync";
import { restoreAndValidateSession } from "@/lib/api/user-session";
import db from "@/lib/db";
import { countPending } from "@/lib/db/queries/utils";
import { Logger } from "@/lib/logger";
import { attemptAsync } from "@/lib/result";
import { globalStore } from "@/lib/store/application-state";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import { addNetworkStateListener, getNetworkStateAsync } from "expo-network";
import { SplashScreen, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";

const logger = Logger.getLogger("API::INIT");
const applicationLogger = Logger.getLogger("APP");

export async function init() {
  const migrationResult = await attemptAsync(async () =>
    migrate(db, migrations),
  );

  if (migrationResult.error != null) {
    logger.error("No se pudo realizar la migración", migrationResult.error);
    globalStore.setState({ lastError: migrationResult.error });
    return migrationResult.error.message;
  }

  logger.info("Migraciones de base de datos aplicadas correctamente");
  logger.info("Iniciando sesión...");
  await restoreAndValidateSession();
  const userId = globalStore.getState().sessionData?.uid;

  globalStore.setState({
    isOnline: await getNetworkStateAsync()
      .then((r) => r.isInternetReachable)
      .catch((r) => null),
    conflicts: 0,
    pendingChanges:
      userId == null ? 0 : await countPending(userId).catch(() => 0),
  });

  queueMicrotask(() => syncAll(true));
  return undefined;
}

export function useInit() {
  const [ok, setOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const router = useRouter();

  const [fontLoaded, fontError] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    init()
      .then((o) => {
        setOk(o === undefined);
        setError(o);
      })
      .then(SplashScreen.hideAsync)
      .finally(() => setLoading(false));

    const networkSubscription = addNetworkStateListener(async (state) => {
      const isOnline = await getNetworkStateAsync()
        .then((r) => r.isInternetReachable)
        .catch((r) => null);

      globalStore.setState({
        isOnline,
      });

      if (isOnline === true) {
        syncAll(true);
      }
    });

    const memoryWarningEventSubscription = AppState.addEventListener(
      "memoryWarning",
      () => {
        applicationLogger.warn("Consumo de memoria alta");
      },
    );

    const unSubscribeGlobal = globalStore.subscribe((state, previousState) => {
      if (
        state.lastError !== previousState.lastError &&
        state.lastError != null
      ) {
        if (
          state.lastError.type === "SessionExpired" ||
          state.lastError.type === "InvalidCredentials"
        )
          Toast.show({
            type: "error",
            text1: "Error",
            text2: state.lastError.message,
            swipeable: true,
            autoHide: true,
          });
      }

      if (state.lastMsg !== previousState.lastMsg && state.lastMsg != null) {
        Toast.show({
          type: "success",
          text1: state.lastMsg,
          swipeable: true,
          autoHide: true,
        });
      }
    });

    return () => {
      networkSubscription.remove();
      memoryWarningEventSubscription.remove();
      unSubscribeGlobal();
    };
  }, []);

  return [ok, loading && !fontLoaded, error ?? fontError?.message] as
    | [true, boolean, undefined]
    | [false, boolean, string];
}
