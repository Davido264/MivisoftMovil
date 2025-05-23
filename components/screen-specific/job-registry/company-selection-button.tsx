import { Building2 } from "@/components/lib/icons/Building2";
import { useSharedCompanyVehicleStore } from "@/lib/store/company-vehicle";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Link } from "expo-router";
import { useEffect } from "react";
import { useStore } from "zustand";

export default function CompanySelectionButton({
  onChangeId,
  storeKey,
  resetVehicle = false,
}: {
  onChangeId?: (id: number) => void;
  storeKey: string;
  resetVehicle?: boolean;
}) {
  const companyVehicleStore = useSharedCompanyVehicleStore(storeKey);
  const company = useStore(companyVehicleStore, (state) => state.company);
  const setVehicle = useStore(companyVehicleStore, (state) => state.setVehicle);

  useEffect(() => {
    onChangeId?.(company.id);
  }, [company, onChangeId, resetVehicle, setVehicle]);

  const companyTitle =
    company.name !== "" ? company.name : "Seleccionar companía";
  const companyClassName =
    company.name !== ""
      ? "text-foreground color-foreground"
      : "text-muted-foreground color-muted-foreground";

  return (
    <Link
      href={{
        pathname: "/job-registry/select-company",
        params: { storeKey, resetVehicle: `${resetVehicle}` },
      }}
      asChild
    >
      <Button
        variant={"outline"}
        className="w-full gap-2 flex-row justify-start"
      >
        <Building2 className={companyClassName} size={20} />
        <Text>{companyTitle}</Text>
      </Button>
    </Link>
  );
}
