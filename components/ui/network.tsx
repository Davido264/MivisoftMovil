import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useGlobalStore } from "@/lib/store/application-state";
import { useNetworkState } from "expo-network";
import { View } from "react-native";

type NetworkBadgeProps = {
  size: number;
};
export function NetworkBadge({ size }: NetworkBadgeProps) {
  const isOnline = useGlobalStore((state) => state.isOnline);

  const msg =
    isOnline === true
      ? "Conectado"
      : isOnline === false
        ? "Desconectado"
        : "Comprobando...";

  const className =
    isOnline === true
      ? "bg-success"
      : isOnline === false
        ? "bg-destructive"
        : "bg-warning";

  const bgClassName =
    isOnline === true
      ? "bg-success-muted"
      : isOnline === false
        ? "bg-destructive-muted"
        : "bg-warning-muted";

  return (
    <Badge
      variant="default"
      className={`flex-row gap-2 items-center justify-center ${bgClassName}`}
    >
      <View
        className={`rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
      <Text className="text-foreground">{msg}</Text>
    </Badge>
  );
}

export function NetworkDot({ className }: { className: string }) {
  const { isInternetReachable } = useNetworkState();

  const bg =
    isInternetReachable === true
      ? "bg-success"
      : isInternetReachable === false
        ? "bg-destructive"
        : "bg-warning";

  return <View className={`${className} ${bg}`} />;
}
