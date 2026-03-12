import { OdooSession } from "@/lib/db/schema/user-session";
import { ApplicationError } from "@/lib/result";
import { createStore, useStore } from "zustand";
import assert from "@/lib/assert";

export type ApplicationState = {
  isOnline: boolean | null;
  isSyncing: boolean;
  conflicts: number;
  pendingChanges: number;

  sessionData: OdooSession | null;

  lastError: ApplicationError | null;
  lastMsg: string | null;
};

export const globalStore = createStore<ApplicationState>()(() => ({
  isOnline: false,
  isSyncing: false,
  conflicts: 0,
  pendingChanges: 0,

  sessionData: null,

  lastError: null,
  lastMsg: null,
}));

export function useIsSessionPresent() {
  const sessionData = useStore(globalStore, (s) => s.sessionData);
  return sessionData != null;
}

export function useGlobalStore<T>(selector: (state: ApplicationState) => T) {
  return useStore(globalStore, selector);
}

export function useSession<T>(selector: (state: OdooSession) => T) {
  return useStore(globalStore, (state) => {
    assert.notNull(state.sessionData, "state.sessionData");
    return selector(state.sessionData);
  });
}
