import { useSession } from "@/lib/store/application-state";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CSS_COLORS } from "@/components/lib/constants";
import { useColorScheme } from "@/components/lib/useColorScheme";
import Options from "@/components/screen-specific/home/session-options";

export default function GradientHeader() {
  const name = useSession((session) => session.name);
  const company = useSession((session) => session.company);

  const { colorScheme } = useColorScheme();

  return (
    <LinearGradient
      className="w-full h-56 justify-between items-start p-4 pb-0"
      colors={[CSS_COLORS[colorScheme].headerGradient, "transparent"]}
      locations={[0.3, 1]}
    >
      <View className="w-full h-6 flex-row justify-end pt-safe gap-6">
        <Options />
      </View>
      <View>
        <Text className="font-bold text-4xl text-start">{name}</Text>
        <Text className="text-start text-muted-foreground">{company}</Text>
      </View>
    </LinearGradient>
  );
}
