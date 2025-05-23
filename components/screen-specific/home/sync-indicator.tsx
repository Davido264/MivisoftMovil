import { CircleFadingArrowUp } from "@/components/lib/icons/CircleFadingArrowUp";
import { GitPullRequestClosed } from "@/components/lib/icons/GitPullRequestClosed";
import { CheckCheck } from "@/components/lib/icons/CheckCheck";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { ActivityIndicator } from "react-native";
import { useGlobalStore } from "@/lib/store/application-state";

export default function SyncIndicator() {
  const isSyncing = useGlobalStore((s) => s.isSyncing);
  const pending = useGlobalStore((s) => s.pendingChanges);
  const conflicting = useGlobalStore((s) => s.conflicts);

  const bgClassName = isSyncing
    ? "bg-warning-muted"
    : pending > 0
      ? "bg-destructive-muted"
      : "bg-success-muted";

  return (
    <Badge variant="outline" className={`flex-row gap-2 ${bgClassName}`}>
      {isSyncing ? (
        <Syncing />
      ) : pending > 0 ? (
        <PendingConflicting pending={pending} conflicting={conflicting} />
      ) : (
        <Updated />
      )}
    </Badge>
  );
}

function Updated() {
  return (
    <>
      <CheckCheck className="color-success" size={14} />
      <Text className="text-foreground">Actualizado</Text>
    </>
  );
}

function Syncing() {
  return (
    <>
      <ActivityIndicator className="color-warning" size={14} />
      <Text className="text-foreground">Sincronizando...</Text>
    </>
  );
}

function PendingConflicting({
  pending,
  conflicting,
}: {
  pending: number;
  conflicting: number;
}) {
  return (
    <>
      <CircleFadingArrowUp size={14} className="color-destructive" />
      <Text className="color-destructive">{pending}</Text>
      {conflicting > 0 ? (
        <>
          <GitPullRequestClosed size={14} className="color-destructive" />
          <Text className="text-destructive">{conflicting}</Text>
        </>
      ) : null}
    </>
  );
}
