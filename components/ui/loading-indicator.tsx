import { useColorScheme } from "@/components/lib/useColorScheme";
import { ActivityIndicator } from "react-native";
import { CSS_COLORS } from "@/components/lib/constants";
import { cn } from "@/components/lib/utils";
import { memo } from "react";

function LoadingIndicator({ className }: { className: string }) {
  const { isDarkColorScheme } = useColorScheme();

  return (
    <ActivityIndicator
      size={"large"}
      color={
        isDarkColorScheme ? CSS_COLORS.dark.primary : CSS_COLORS.light.primary
      }
      className={cn(className, "bg-background")}
    />
  );
}

export default memo(LoadingIndicator);
