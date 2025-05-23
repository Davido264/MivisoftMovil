import { useIsSessionPresent } from "@/lib/store/application-state";
import { Redirect, Stack } from "expo-router";

export default function AuthorizedLayout() {
  console.log("render root layout for protected routes");
  const isSessionPresent = useIsSessionPresent();

  if (!isSessionPresent) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerTitleAlign: "left" }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="worktime-registry"
        options={{ title: "Registro de Jornada", headerShown: true }}
      />

      <Stack.Screen name="job-registry" options={{ headerShown: false }} />
      <Stack.Screen name="(shared)/gallery" options={{ title: "Fotos", headerShown: true }} />
      <Stack.Screen name="pending" options={{ title: "Cambios Pendientes", headerShown: true }} />
    </Stack>
  );
}
