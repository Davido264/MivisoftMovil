import { useIsSessionPresent } from "@/lib/store/application-state";
import { Redirect, Stack } from "expo-router";

export default function LoginLayout() {
  const isSessionPresent = useIsSessionPresent();

  if (isSessionPresent) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}
