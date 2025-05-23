import { View } from "react-native";
import { CalendarPlus } from "@/components/lib/icons/CalendarPlus";
import { Link } from "expo-router";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function NewWorktime() {
  return (
    <View className="flex-1 items-center justify-center px-4 py-2 gap-20">
      <CalendarPlus className="color-muted" size={120} />
      <View className="flex-col gap-4 w-64">
        <Link href="/worktime-registry" asChild>
          <Button variant="default">
            <Text>Iniciar Jornada</Text>
          </Button>
        </Link>
        <Link
          href={{
            pathname: "/job-registry/all",
            params: { canEdit: "" },
          }}
          asChild
        >
          <Button variant="outline">
            <Text>Ver Registros</Text>
          </Button>
        </Link>
      </View>
    </View>
  );
}
