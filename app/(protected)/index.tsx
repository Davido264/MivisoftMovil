import DateBadge from "@/components/screen-specific/home/datetime-badge";
import GradientHeader from "@/components/screen-specific/home/gradient-header";
import JobRegistryOverView from "@/components/screen-specific/home/job-registry-overview";
import NewWorktime from "@/components/screen-specific/home/new-worktime";
import SyncIndicator from "@/components/screen-specific/home/sync-indicator";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { NetworkBadge } from "@/components/ui/network";
import { getCurrentWorktimeRegistryForUser } from "@/lib/db/queries/worktime-registry";
import { useSession } from "@/lib/store/application-state";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { View } from "react-native";

export default function Index() {
  const userId = useSession((s) => s.uid);
  const { data, updatedAt } = useLiveQuery(
    getCurrentWorktimeRegistryForUser(userId),
  );
  const currentWorktime =
    data?.length > 0 && data[0].endDate == null ? data[0] : undefined;

  return (
    <View className="flex-1">
      <GradientHeader />
      <View className="w-full flex-row items-start px-4 py-2 gap-2">
        <NetworkBadge size={10} />
        {currentWorktime && <DateBadge date={currentWorktime.startDate} />}
        <SyncIndicator />
      </View>
      {!updatedAt ? (
        <LoadingIndicator className="flex-1 items-center justify-center" />
      ) : currentWorktime ? (
        <JobRegistryOverView />
      ) : (
        <NewWorktime />
      )}
    </View>
  );
}
