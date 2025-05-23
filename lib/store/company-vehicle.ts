import { useEffect, useState } from "react";
import { alloc, free } from "./repo";
import { StoreApi } from "zustand";

export type CompanyVehicleStore = {
  company: { id: number; name: string };
  vehicle: { id: number; name: string };
  setCompany: (c: { id: number; name: string }, resetVehicle?: boolean) => void;
  setVehicle: (v: { id: number; name: string }) => void;
};

export function useSharedCompanyVehicleStore(key: string) {
  const [store] = useState(() =>
    alloc<CompanyVehicleStore>(key, (set, get) => ({
      company: { id: 0, name: "" },
      vehicle: { id: 0, name: "" },

      setCompany: (company, resetVehicle = false) =>
        set({
          company,
          vehicle: resetVehicle ? { id: 0, name: "" } : get().vehicle,
        }),
      setVehicle: (vehicle) => set({ vehicle }),
    })),
  );
  useEffect(() => () => free(key), [key]);
  return store as StoreApi<CompanyVehicleStore>;
}
