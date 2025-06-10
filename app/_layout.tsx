import "@/global.css";

import { NAV_THEME } from "@/components/lib/constants";
import { useColorScheme } from "@/components/lib/useColorScheme";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import ErrorScreen from "@/components/ui/error-screen";
import { ToastProvider } from "@/components/ui/toast";
import { useInit } from "@/lib/api/init";
import { _expoAppConnection } from "@/lib/db";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useSQLiteDevTools } from "expo-sqlite-devtools";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "react-native-reanimated";

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
