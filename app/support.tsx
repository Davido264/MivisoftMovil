import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useGlobalStore } from "@/lib/store/application-state";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Bug } from "@/components/lib/icons/Bug";
import { exportLogs } from "@/lib/logger";
import { useState } from "react";

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
        onPress={() => {
          setLoading(true);
          exportLogs().then(() => setLoading(false));
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
      <Text>{lastError.message}</Text>
      {lastError.original && (
        <Text>Detalles: {lastError.original.message}</Text>
      )}
    </ScrollView>
  );
}
