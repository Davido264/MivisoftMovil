import { Text } from "@/components/ui/text";
import { IdNamedList } from "@/components/ui/id-named-list";
import { getAllItineraries } from "@/lib/db/queries/resources";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useLocalSearchParams, useRouter } from "expo-router";
import LoadingIndicator from "@/components/ui/loading-indicator";
import assert from "@/lib/assert";
import { useSharedItineraryStore } from "@/lib/store/itinerary";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";

export default function SelectItinerary() {
  const { data, error, updatedAt } = useLiveQuery(getAllItineraries());

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 justify-center items-center" />;
  }

  return (
    <IdNamedList data={data} error={error?.message}>
      <IdNamedList.SearchField />
      <IdNamedList.ElementList ElementItem={ElementItem} bottomSafe />
    </IdNamedList>
  );
}

function ElementItem(item: { id: number; name: string; actCount: number }) {
  const { storeKey } = useLocalSearchParams<{
    storeKey: string;
  }>();

  assert.notNull(storeKey);

  const store = useSharedItineraryStore(storeKey);
  const setItinerary = useStore(store, (s) => s.setItinerary);
  const router = useRouter();
  return (
    <Button
      className="w-full items-start py-4 my-2 rounded-none"
      variant="ghost"
      onPress={() => {
        setItinerary(item.id, item.name);
        router.back();
      }}
    >
      <Text className="text-lg flex-shrink text-wrap">{item.name}</Text>
    </Button>
  );
}
