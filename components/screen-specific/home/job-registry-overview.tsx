import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight } from "@/components/lib/icons/ArrowUpRight";
import { JobRegistryCard } from "@/components/ui/job-registry-card";
import { ClipboardCheck } from "@/components/lib/icons/ClipboardCheck";
import { Link, LinkProps } from "expo-router";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { getLatestOpenJobRegistryForUser } from "@/lib/db/queries/job-registry";
import { useSession } from "@/lib/store/application-state";
import LoadingIndicator from "@/components/ui/loading-indicator";

export default function JobRegistryOverView() {
  return (
    <>
      <View className="w-full px-4 py-2">
        <View className="w-full items-center justify-center p-2 gap-2">
          <View className="w-full h-[350]">
            <JobRegistryOverViewInternal />
          </View>
          <Link
            href={{ pathname: "/job-registry/all", params: { canEdit: "1" } }}
            asChild
          >
            <Button
              variant="outline"
              size="sm"
              className="px-5 flex-row items-center justify-center gap-2 rouded-full"
            >
              <Text className="text-lg text-muted-foreground">Ver más</Text>
              <ArrowUpRight className="color-muted-foreground" size={20} />
            </Button>
          </Link>
        </View>
      </View>
      <View className="w-full gap-3 px-4 pt-5">
        <Link href="/job-registry/new" asChild>
          <Button variant="outline">
            <Text>Crear Reporte</Text>
          </Button>
        </Link>
        <Link href="/worktime-registry" asChild>
          <Button variant="outline">
            <Text className="text-destructive">Finalizar Jornada</Text>
          </Button>
        </Link>
      </View>
    </>
  );
}

function JobRegistryOverViewInternal() {
  const userId = useSession((session) => session.uid);
  const { data, updatedAt } = useLiveQuery(
    getLatestOpenJobRegistryForUser(userId),
  );

  if (!updatedAt) {
    return (
      <LoadingIndicator className="w-full h-full items-center justify-center" />
    );
  }

  const item = data?.length > 0 ? data[0] : undefined;

  if (!item) {
    return (
      <View className="w-full h-full items-center gap-4 justify-center">
        <ClipboardCheck size={120} className="color-muted-foreground" />
        <Text className="text-muted-foreground text-lg">
          No se tienen actividades en progreso
        </Text>
      </View>
    );
  }

  const observationHref = {
    pathname: "/job-registry/observation",
    params: { jobRegistryId: item.id.toString() },
  } as LinkProps["href"]

  return (
    <JobRegistryCard jobReg={item}>
      <JobRegistryCard.Header observationsHref={observationHref} />
      <CardContent className="gap-2">
        <JobRegistryCard.Itinerary />
        <JobRegistryCard.Company />
        <JobRegistryCard.Unit />
        <JobRegistryCard.Progress />
      </CardContent>
      <Separator className="mb-4" />
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
    </JobRegistryCard>
  );
}
