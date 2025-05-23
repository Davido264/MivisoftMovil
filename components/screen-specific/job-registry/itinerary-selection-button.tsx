import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Link } from "expo-router";
import { useEffect } from "react";
import { useStore } from "zustand";
import { useSharedItineraryStore } from "@/lib/store/itinerary";
import { ClipboardCheck } from "@/components/lib/icons/ClipboardCheck";

export default function VehicleSelectionButton({
  onChange,
  storeKey,
}: {
  onChange?: (id: number, name: string) => void;
  storeKey: string;
}) {
  const itineraryStore = useSharedItineraryStore(storeKey);
  const itineraryName = useStore(
    itineraryStore,
    (state) => state.itineraryName,
  );
  const itineraryId = useStore(itineraryStore, (state) => state.itineraryId);

  useEffect(() => {
    onChange?.(itineraryId, itineraryName);
  }, [itineraryId, itineraryName, onChange]);

  const itineraryTitle =
    itineraryName !== "" ? itineraryName : "Seleccionar itinerario";
  const itineraryClassName =
    itineraryName !== ""
      ? "text-foreground color-foreground"
      : "text-muted-foreground color-muted-foreground";

  return (
    <Link
      href={{
        pathname: "/job-registry/select-itinerary",
        params: { storeKey },
      }}
      asChild
    >
      <Button
        variant={"outline"}
        className="w-full gap-2 flex-row justify-start"
      >
        <ClipboardCheck className={itineraryClassName} size={20} />
        <Text>{itineraryTitle}</Text>
      </Button>
    </Link>
  );
}
