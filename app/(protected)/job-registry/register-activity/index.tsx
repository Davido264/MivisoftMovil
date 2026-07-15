import { Button } from "@/components/ui/button";
import { IdNamedList } from "@/components/ui/id-named-list";
import { getItineraryActivitiesForJobRegistryId } from "@/lib/db/queries/resources";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Link, Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { Send } from "@/components/lib/icons/Send";
import { CheckCheck } from "@/components/lib/icons/CheckCheck";
import { ActivitySelect } from "@/lib/db/schema/resources";

const taskStoreKey = "register-job-registry-tasks";
const imageStoreKey = "register-job-registry-photos";

export default function RegisterActivity() {
  const { jobregid } = useLocalSearchParams<{
    jobregid?: string;
  }>();

  const router = useRouter();

  const { data, error, updatedAt } = useLiveQuery(
    getItineraryActivitiesForJobRegistryId(Number(jobregid ?? "0")),
  );

  if (!jobregid) {
    return <Redirect href="/job-registry/all" />;
  }

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 items-center justify-center" />;
  }

  return (
    <View className="flex-1 gap-2">
      <IdNamedList data={data} error={error?.message}>
        <IdNamedList.SearchField />
        <IdNamedList.ElementList ElementItem={ElementItem} bottomSafe />
      </IdNamedList>
      <View className="px-4 pb-safe-offset-4">
        <Button onPress={() => router.dismissTo("/")}>
          <Text>Volver al inicio</Text>
        </Button>
      </View>
    </View>
  );
}

function ElementItem(
  item: ActivitySelect & {
    totalTasks: number;
    completedTasks: number;
    registerId: number | null;
  },
) {
  const { jobregid } = useLocalSearchParams<{
    jobregid?: string;
  }>();

  const navigationParams = {
    actid: item.id.toString(),
    actName: item.name,
    actregid: item.registerId?.toString() ?? "",
    jobregid: jobregid,
  };

  const isCompleted =
    (item.totalTasks !== 0 && item.completedTasks === item.totalTasks) ||
    (item.totalTasks === 0 && item.registerId !== null);

  let description = "";
  if (isCompleted) {
    description = "Completado";
  } else if (item.totalTasks === 0) {
    description = "Esta actividad no tiene tareas";
  } else {
    description = `${item.completedTasks} / ${item.totalTasks}`;
  }

  return (
    <View className="w-full flex-row p-4 my-2 items-center justify-between">
      <View className="flex-1 flex-col">
        <Text>{item.name}</Text>
        <Text
          className={`${isCompleted ? "text-success" : "text-muted-foreground"} text-sm`}
        >
          {description}
        </Text>
      </View>
      {isCompleted || (
        <View className="flex-row items-center gap-2">
          {(item.totalTasks ?? 0) > 0 && (
            <Link
              href={{
                pathname: "/job-registry/register-activity/tasks",
                params: { ...navigationParams, taskStoreKey, imageStoreKey },
              }}
              asChild
            >
              <Button variant="outline" size="icon">
                <CheckCheck size={16} className="color-foreground" />
              </Button>
            </Link>
          )}
          <Link
            href={{
              pathname: "/job-registry/register-activity/form",
              params: {
                ...navigationParams,
                taskStoreKey,
                imageStoreKey,
                completeAll: "true",
              },
            }}
            asChild
          >
            <Button variant="outline" size="icon">
              <Send size={16} className="color-foreground" />
            </Button>
          </Link>
        </View>
      )}
    </View>
  );
}
