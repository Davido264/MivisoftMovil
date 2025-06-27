import { useColorScheme } from "@/components/lib/useColorScheme";
import { ActivityIndicator, View } from "react-native";
import { CSS_COLORS } from "@/components/lib/constants";
import { cn } from "@/components/lib/utils";
import { memo, useEffect, useState } from "react";

function LoadingIndicator({ className }: { className: string }) {
  const { isDarkColorScheme } = useColorScheme();
  const [showLoading, setShowLoading] = useState(false);
  const clazz = cn(className, "bg-background")

  useEffect(() => {
    setTimeout(() => {
      setShowLoading(true);
    }, 100);
  }, []);

  if (!showLoading) {
    return <View className={clazz} />;
  }

  return (
    <ActivityIndicator
      size={"large"}
      color={
        isDarkColorScheme ? CSS_COLORS.dark.primary : CSS_COLORS.light.primary
      }
      className={clazz}
    />
  );
}

export default memo(LoadingIndicator);
