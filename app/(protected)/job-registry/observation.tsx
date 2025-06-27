import assert from "@/lib/assert";
import { useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native-gesture-handler";
import { Text } from "@/components/ui/text";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getObservationForJobRegistry } from "@/lib/db/queries/job-registry";
import LoadingIndicator from "@/components/ui/loading-indicator";
import ErrorScreen from "@/components/ui/error-screen";

export default function Observation() {
  const { jobRegistryId } = useLocalSearchParams<{
    jobRegistryId: string;
  }>();

  assert.notNull(jobRegistryId);

  const { data, error, updatedAt } = useLiveQuery(
    getObservationForJobRegistry(Number(jobRegistryId)),
  );

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 items-center justify-center" />;
  }

  if (error) {
    return <ErrorScreen msg={error.message} />;
  }

  assert(data.length === 1);

  return (
    <ScrollView className="flex-1 p-4">
      <Text>{data[0].observation}</Text>
    </ScrollView>
  );
}
