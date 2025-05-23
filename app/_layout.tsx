import "@/global.css";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  Theme,
} from "@react-navigation/native";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NAV_THEME } from "@/components/lib/constants";
import { useColorScheme } from "@/components/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";

import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ToastProvider } from "@/components/ui/toast";
import { _expoAppConnection } from "@/lib/db";
import { useSQLiteDevTools } from "expo-sqlite-devtools";
import { useInit } from "@/lib/api/init";
import ErrorScreen from "@/components/ui/error-screen";
import { _internal_preventAutoHideAsync } from "expo-router/build/utils/splash";

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isDarkColorScheme } = useColorScheme();

  useSQLiteDevTools(_expoAppConnection);

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <GestureHandlerRootView>
        <BottomSheetModalProvider>
          <KeyboardProvider>
            <InnerLayout />
          </KeyboardProvider>
          <StatusBar style="auto" />
          <ToastProvider />
          <PortalHost />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

function InnerLayout() {
  console.log("render root layout");

  useSQLiteDevTools(_internal_preventAutoHideAsync);

  const [ok, loading, error] = useInit();

  if (loading) {
    return null;
  }

  if (!ok) {
    return <ErrorScreen msg={error} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(protected)" />
      <Stack.Screen name="(login)" />
      <Stack.Screen
        name="support"
        options={{ headerShown: true, title: "Soporte y Auditoría" }}
      />
    </Stack>
  );
}
