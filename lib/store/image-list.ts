import { useEffect, useState } from "react";
import { alloc, free } from "./repo";
import { StoreApi } from "zustand";

export type ImageListStore = {
  photos: string[];
  addUris: (n: string[]) => void;
  replaceUris: (n: string[]) => void;
  removeUri: (n: string) => void;
};

export function useSharedImageListStore(key: string) {
  const [store] = useState(() =>
    alloc<ImageListStore>(key, (set, get) => ({
      photos: [],
      addUris: (uris) => set({ photos: [...get().photos, ...uris] }),
      replaceUris: (uris) => set({ photos: uris }),
      removeUri: (uri) =>
        set({ photos: get().photos.filter((p) => p !== uri) }),
    })),
  );
  useEffect(() => () => free(key), [key]);
  return store as StoreApi<ImageListStore>;
}
