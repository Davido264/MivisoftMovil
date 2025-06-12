import { View } from "react-native";
import { TriangleAlert } from "@/components/lib/icons/TriangleAlert";
import { Text } from "@react-navigation/elements";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export default function ErrorScreen({ msg }: { msg?: string }) {
  return (
    <View className="flex-1 items-center justify-center p-4 bg-background gap-10">
      <Card className="h-4/5 justify-center">
        <CardHeader>
          <View className="w-full items-center">
            <TriangleAlert className="color-foreground" size={120} />
          </View>
          <CardTitle className="justify-center">
            <Text className="text-lg text-center font-bold">
              La aplicación ha llegado a un error irrecuperable
            </Text>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text className="text-wrap text-sm">{msg}</Text>
        </CardContent>
      </Card>
    </View>
  );
}
