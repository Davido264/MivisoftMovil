import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import {
  getAllJobRegistries,
  JobRegistryState,
} from "@/lib/db/queries/job-registry";
import { IdNamedList } from "@/components/ui/id-named-list";
import { JobRegistryCard } from "@/components/ui/job-registry-card";
import { CardContent } from "@/components/ui/card";
import { useSession } from "@/lib/store/application-state";
import { useSharedCompanyVehicleStore } from "@/lib/store/company-vehicle";
import { useLocalSearchParams, LinkProps } from "expo-router";
import { View } from "react-native";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import CompanySelectionButton from "@/components/screen-specific/job-registry/company-selection-button";
import VehicleSelectionButton from "@/components/screen-specific/job-registry/vehicle-selection-button";
import ItinerarySelectionButton from "@/components/screen-specific/job-registry/itinerary-selection-button";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { useStore } from "zustand";
import { useSharedItineraryStore } from "@/lib/store/itinerary";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Funnel } from "@/components/lib/icons/Funnel";

const companyVehicleStoreKey = "company-vehicle-store";
const itineraryStoreKey = "itinerary-store";

export default function AllJobRegistries() {
  const { data, error, updatedAt } = useLiveQuery(getAllJobRegistries());
  const { canEdit } = useLocalSearchParams<{ canEdit?: string }>();

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 items-center justify-center" />;
  }

  return (
    <IdNamedList data={data} error={error?.message}>
      <IdNamedList.SearchField />
      <IdNamedList.CustomFilters>{Filters}</IdNamedList.CustomFilters>
      <View className="w-full items-center py-2">
        <Text className="text-sm text-muted-foreground">
          Historial de 30 días
        </Text>
      </View>
      <IdNamedList.ElementList
        bottomSafe
        ElementItem={(item) => (
          <ElementItem
            item={item as JobRegistryState}
            canEdit={Boolean(canEdit)}
          />
        )}
      />
    </IdNamedList>
  );
}

type _setFilterFn = (fn: (item: JobRegistryState) => boolean) => void;

function ElementItem({
  item,
  canEdit,
}: {
  item: JobRegistryState;
  canEdit: boolean;
}) {
  const userId = useSession((session) => session.uid);
  const actionable = userId === item.userId && canEdit;

  const observationHref = {
    pathname: "/job-registry/observation",
    params: { jobRegistryId: item.id.toString() },
  } as LinkProps["href"];

  return (
    <View className="p-4">
      <JobRegistryCard jobReg={item}>
        <JobRegistryCard.Header observationsHref={observationHref} />
        <CardContent>
          <JobRegistryCard.Itinerary />
          <JobRegistryCard.Company />
          <JobRegistryCard.Unit />
          {item.endDate != null ? (
            <JobRegistryCard.Score />
          ) : (
            <JobRegistryCard.Progress />
          )}
        </CardContent>
        {actionable && item.endDate == null ? (
          <JobRegistryCard.Actions
            canFinish={
              item.totalActivities > 0 &&
              item.completedActivities === item.totalActivities
            }
            endHref={{
              pathname: "/job-registry/finish",
              params: { jobregid: item.id.toString() },
            }}
            registryHref={{
              pathname: "/job-registry/register-activity",
              params: {
                jobregid: item.id.toString(),
                itinerayid: item.itineraryId.toString(),
              },
            }}
          />
        ) : (
          <JobRegistryCard.ObservationFooter href={observationHref} />
        )}
      </JobRegistryCard>
    </View>
  );
}

function Filters({ setFilter }: { setFilter: _setFilterFn }) {
  const cvStore = useSharedCompanyVehicleStore(companyVehicleStoreKey);
  const companyId = useStore(cvStore, (state) => state.company.id);
  const vehicleId = useStore(cvStore, (state) => state.vehicle.id);

  const setCompanyId = useStore(cvStore, (state) => state.setCompany);
  const setVehicleId = useStore(cvStore, (state) => state.setVehicle);

  const itStore = useSharedItineraryStore(itineraryStoreKey);
  const itineraryId = useStore(itStore, (state) => state.itineraryId);

  const setItinerary = useStore(itStore, (state) => state.setItinerary);

  const userid = useSession((session) => session.uid);
  const [mine, setMine] = useState<boolean>(true);
  const [includeClosed, setIncludeClosed] = useState<boolean>(false);

  useEffect(() => {
    setFilter(
      (item: JobRegistryState) =>
        (companyId !== 0 ? item.companyId === companyId : true) &&
        (vehicleId !== 0 ? item.vehicleId === vehicleId : true) &&
        (itineraryId !== 0 ? item.itineraryId === itineraryId : true) &&
        (mine ? userid === item.userId : true) &&
        (includeClosed ? true : item.endDate === null),
    );
  }, [
    itineraryId,
    companyId,
    vehicleId,
    mine,
    setFilter,
    userid,
    includeClosed,
  ]);

  return (
    <Accordion className="w-full px-4" collapsible type="single">
      <AccordionItem value="filters">
        <AccordionTrigger className="w-full">
          <View className="flex-row gap-3 justify-start items-center">
            <Funnel className="color-muted-foreground" size={16} />
            <Text>Filtros</Text>
          </View>
        </AccordionTrigger>
        <AccordionContent className="gap-3 px-4">
          <CompanySelectionButton storeKey={companyVehicleStoreKey} />
          <VehicleSelectionButton storeKey={companyVehicleStoreKey} />
          <ItinerarySelectionButton storeKey={itineraryStoreKey} />
          <View className="flex-row gap-3">
            <Checkbox checked={mine} onCheckedChange={setMine} />
            <Text>Sólo míos</Text>
          </View>
          <View className="flex-row gap-3">
            <Checkbox
              checked={includeClosed}
              onCheckedChange={setIncludeClosed}
            />
            <Text>Mostrar terminados</Text>
          </View>
          <View className="w-full items-end">
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                setCompanyId({ id: 0, name: "" });
                setVehicleId({ id: 0, name: "" });
                setItinerary(0, "");
                setMine(true);
                setIncludeClosed(false);
              }}
            >
              <Text>Borrar filtros</Text>
            </Button>
          </View>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
