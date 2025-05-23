import assert from "@/lib/assert";
import { createStore, StateCreator, StoreApi } from "zustand";
import { CompanyVehicleStore } from "@/lib/store/company-vehicle";
import { ItineraryStore } from "@/lib/store/itinerary";
import { ImageListStore } from "@/lib/store/image-list";
import { TaskListStore } from "@/lib/store/tasks-list";

type ManagedStore =
  | CompanyVehicleStore
  | ItineraryStore
  | ImageListStore
  | TaskListStore;

const cache = new Map<string, { store: StoreApi<ManagedStore>; rc: number }>();

export function alloc<T extends ManagedStore>(
  key: string,
  initializer: StateCreator<T, [], [], T>,
) {
  if (cache.has(key)) {
    const cell = cache.get(key);
    assert.notNull(cell);
    cell.rc++;
    return cell.store;
  }
  const store = createStore(initializer);

  cache.set(key, { store: store, rc: 1 });
  return store as StoreApi<T>;
}

export function free(key: string) {
  const cell = cache.get(key);
  assert.notNull(cell);

  cell.rc--;
  if (cell.rc === 0) {
    cache.delete(key);
  }
}
