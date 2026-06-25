import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { globalStore, useGlobalStore } from "@/lib/store/application-state";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Bug } from "@/components/lib/icons/Bug";
import { exportLogs, Logger } from "@/lib/logger";
import { useState } from "react";
import { getPendingJobRegistries } from "@/lib/db/queries/job-registry";
import { getPendingActivityRegistries } from "@/lib/db/queries/activity-registries";
import { getPendingTaskRegistries } from "@/lib/db/queries/task-registries";
import { getAllPendingWorktimeRegistries } from "@/lib/db/queries/worktime-registry";
import { getDirtyPhotos } from "@/lib/db/queries/photos";

export default function Support() {
  const [loading, setLoading] = useState(false);
  return (
    <View className="flex-1 items-center mb-safe-offset-5 justify-start p-4 gap-10">
      <View className="w-full gap-2">
        <Text>
          En esta pantalla se podrá visualizar el último error de la aplicación
          registrado, así como la posibilidad de exportar los logs.
        </Text>
        <Text>
          Esta aplicación registra las acciones del usuario y los errores
          encontrados y los almacena con la posibilidad de poder resolver
          problemas con la misma más rápido. Cabe recalcar que no se recolecta
          información personal.
        </Text>
        <Text>
          Si encuentra un error, contáctece con su encargad@ comunicandole
          comedidamente que se jodió todo, y enviando el archivo resultante de
          presional el siguiente botón. El o ella sabrá comunicarse con el
          equipo de desarrollo para poder encontrar el problema y la solución al
          mismo.
        </Text>
      </View>
      <ErrorMessage />
      <Button
        variant="default"
        disabled={loading}
        className="flex-row w-full gap-3 mt-auto"
        onPress={async () => {
          setLoading(true);
          const { sessionData } = globalStore.getState();
          if (sessionData == null) {
            return exportLogs(null).then(() => setLoading(false));
          }
          const state = {
            jobRegistry: await getPendingJobRegistries(sessionData.uid),
            activityRegistry: await getPendingActivityRegistries(
              sessionData.uid,
            ),
            taskRegistry: await getPendingTaskRegistries(sessionData.uid),
            worktimeRegistry: await getAllPendingWorktimeRegistries(
              sessionData.uid,
            ),
            photos: await getDirtyPhotos(sessionData.uid),
          };
          return exportLogs(state).then(() => setLoading(false));
        }}
      >
        {loading ? (
          <ActivityIndicator
            className="color-primary-foreground"
            size="small"
          />
        ) : (
          <>
            <Bug className="color-primary-foreground" />
            <Text>Exportar logs</Text>
          </>
        )}
      </Button>
    </View>
  );
}

function ErrorMessage() {
  const lastError = useGlobalStore((s) => s.lastError);

  if (!lastError) {
    return null;
  }

  return (
    <ScrollView
      className="w-full p-4 bg-destructive-muted rounded-lg border border-destructive"
      contentContainerClassName="gap-2"
    >
      <Text className="font-bold">
        Último error registrado ({lastError.type})
      </Text>
      <Text>{Logger.formatErrorMessage(lastError)}</Text>
    </ScrollView>
  );
}
