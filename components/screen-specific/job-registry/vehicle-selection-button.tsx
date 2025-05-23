import { BusFront } from "@/components/lib/icons/BusFront";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Link } from "expo-router";
import { useEffect } from "react";
import { useSharedCompanyVehicleStore } from "@/lib/store/company-vehicle";
import { useStore } from "zustand";

export default function VehicleSelectionButton({
  onChangeId,
  storeKey,
  disable = false,
}: {
  disable?: boolean;
  onChangeId?: (id: number) => void;
  storeKey: string;
}) {
  const companyVehicleStore = useSharedCompanyVehicleStore(storeKey);
  const vehicle = useStore(companyVehicleStore, (state) => state.vehicle);

  useEffect(() => {
    onChangeId?.(vehicle.id);
  }, [vehicle, onChangeId]);

  const vehicleTitle =
    vehicle.name !== "" ? vehicle.name : "Seleccionar vehículo";
  const vehicleClassName =
    vehicle.name !== ""
      ? "text-foreground color-foreground"
      : "text-muted-foreground color-muted-foreground";

  return (
    <Link
      href={{ pathname: "/job-registry/select-vehicle", params: { storeKey } }}
      asChild
    >
      <Button
        variant={"outline"}
        disabled={disable}
        className="w-full gap-2 flex-row justify-start"
      >
        <BusFront className={vehicleClassName} size={20} />
        <Text>{vehicleTitle}</Text>
      </Button>
    </Link>
  );
}
