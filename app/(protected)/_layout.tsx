import { Images } from "@/components/lib/icons/Images";
import { Button } from "@/components/ui/button";
import { useIsSessionPresent } from "@/lib/store/application-state";
import { Link, Redirect, Stack } from "expo-router";

export default function AuthorizedLayout() {
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
      <Stack.Screen
        name="(shared)/gallery"
        options={{ title: "Fotos", headerShown: true }}
      />
      <Stack.Screen
        name="pending"
        options={{
          title: "Cambios Pendientes",
          headerShown: true,
          headerRight: () => (
            <Link
              href={{ pathname: "/gallery", params: { model: "all" } }}
              asChild
            >
              <Button variant="ghost" size="icon">
                <Images size={16} className="color-foreground" />
              </Button>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}
