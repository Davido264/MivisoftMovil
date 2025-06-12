import { Text } from "@/components/ui/text";
import { getAllVehicles } from "@/lib/db/queries/company-vehicles";
import { Button } from "@/components/ui/button";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { View } from "react-native";
import { IdNamedList } from "@/components/ui/id-named-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { useSharedCompanyVehicleStore } from "@/lib/store/company-vehicle";
import { useStore } from "zustand";
import assert from "@/lib/assert";

export default function SelectVehicle() {
  const { storeKey } = useLocalSearchParams<{ storeKey: string }>();
  assert.notNull(storeKey);

  const store = useSharedCompanyVehicleStore(storeKey);
  const company = useStore(store, (s) => s.company);

  const { data, error, updatedAt } = useLiveQuery(getAllVehicles(company.id));

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 items-center justify-center" />;
  }

  return (
    <View className="flex-1 gap-2">
      <IdNamedList data={data} error={error?.message}>
        <IdNamedList.SearchField />
        <IdNamedList.ElementList ElementItem={ElementItem} bottomSafe />
      </IdNamedList>
    </View>
  );
}

function ElementItem(item: { id: number; name: string }) {
  const { storeKey } = useLocalSearchParams<{ storeKey: string }>();
  assert.notNull(storeKey);

  const store = useSharedCompanyVehicleStore(storeKey);
  const setVehicle = useStore(store, (s) => s.setVehicle);
  const router = useRouter();

  return (
    <Button
      className="w-full py-4 my-2 items-start rounded-none"
      variant="ghost"
      onPress={() => {
        setVehicle(item);
        router.back();
      }}
    >
      <Text className="text-lg flex-shrink text-wrap">{item.name}</Text>
    </Button>
  );
}
