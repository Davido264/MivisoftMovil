import { Text } from "@/components/ui/text";
import { IdNamedList } from "@/components/ui/id-named-list";
import { getAllItineraries } from "@/lib/db/queries/resources";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Pressable } from "react-native";
import { Link } from "expo-router";
import LoadingIndicator from "@/components/ui/loading-indicator";

export default function NewJobRegistry() {
  console.log("render NewJobRegistry");
  const { data, error, updatedAt } = useLiveQuery(getAllItineraries());

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 justify-center items-center" />;
  }

  return (
    <IdNamedList data={data} error={error?.message}>
      <IdNamedList.SearchField />
      <IdNamedList.ElementList
        ElementItem={ElementItem}
        bottomSafe
      />
    </IdNamedList>
  );
}

function ElementItem(item: { id: number; name: string; actCount: number }) {
  const activityLavel = item.actCount > 1 ? "Actividades" : "Actividad";

  return (
    <Link
      href={{ pathname: "/job-registry/new/form", params: item }}
      asChild
      replace
    >
      <Pressable
        className="w-full active:bg-accent items-start gap-1 px-4 py-2 my-2"
        role="button"
      >
        <Text className="text-lg flex-shrink text-wrap">{item.name}</Text>
        {item.actCount > 0 && (
          <Text className="text-muted-foreground text-sm">
            {item.actCount} {activityLavel}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}
