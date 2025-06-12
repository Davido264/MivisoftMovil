import { Stack } from "expo-router";

export default function StartJobFormLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="all"
        options={{ title: "Trabajos", headerShown: true }}
      />

      <Stack.Screen
        name="new/index"
        options={{
          title: "Seleccionar Itinerario",
          headerShown: true,
          presentation: "modal",
        }}
      />

      <Stack.Screen name="new/form" options={{ headerShown: true }} />

      <Stack.Screen
        name="select-company"
        options={{
          title: "Seleccionar Companía",
          headerShown: true,
          presentation: "modal",
        }}
      />

      <Stack.Screen
        name="select-itinerary"
        options={{
          title: "Seleccionar Itinerario",
          headerShown: true,
          presentation: "modal",
        }}
      />

      <Stack.Screen
        name="select-vehicle"
        options={{
          title: "Seleccionar Unidad",
          headerShown: true,
          presentation: "modal",
        }}
      />

      <Stack.Screen
        name="finish"
        options={{ title: "Terminar Registro", headerShown: true }}
      />

      <Stack.Screen
        name="register-activity/index"
        options={{
          title: "Seleccionar Actividad",
          headerShown: true,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="register-activity/form"
        options={{ title: "Registrar Actividad", headerShown: true }}
      />
      <Stack.Screen
        name="register-activity/tasks"
        options={{
          title: "Lista de Tareas",
          headerShown: true,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="register-activity/task-observation"
        options={{
          title: "Observación de Tarea",
          headerShown: true,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
