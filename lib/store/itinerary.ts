import { useEffect, useState } from "react";
import { alloc, free } from "@/lib/store/repo";
import { StoreApi } from "zustand";

export type ItineraryStore = {
  itineraryId: number;
  itineraryName: string;
  setItinerary: (itineraryId: number, itineraryName: string) => void;
};

export function useSharedItineraryStore(key: string) {
  const [store] = useState(() =>
    alloc<ItineraryStore>(key, (set) => ({
      itineraryId: 0,
      itineraryName: "",
      setItinerary: (itineraryId, itineraryName) =>
        set({ itineraryId, itineraryName }),
    })),
  );

  useEffect(() => () => free(key), [key]);
  return store as StoreApi<ItineraryStore>;
}
