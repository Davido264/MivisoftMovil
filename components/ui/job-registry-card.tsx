import { createContext, PropsWithChildren, ReactNode, useContext } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import assert from "@/lib/assert";
import { formatDateTime } from "@/lib/date";
import { ClipboardCheck } from "@/components/lib/icons/ClipboardCheck";
import { Building2 } from "@/components/lib/icons/Building2";
import { BusFront } from "@/components/lib/icons/BusFront";
import { Star } from "@/components/lib/icons/Star";
import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "expo-router";
import { LinkProps } from "expo-router/build/link/Link";
import { JobRegistryState } from "@/lib/db/queries/job-registry";
import { Badge } from "@/components/ui/badge";

const JobRegistryCardContext = createContext<Partial<JobRegistryState> | null>(
  null,
);

type JobRegistryCardProps = PropsWithChildren & {
  jobReg: Partial<JobRegistryState>;
};

function useCardContext() {
  const context = useContext(JobRegistryCardContext);
  assert.notNull(context);

  return context;
}

export function JobRegistryCard({ jobReg, children }: JobRegistryCardProps) {
  return (
    <Card className="">
      <JobRegistryCardContext.Provider value={jobReg}>
        {children}
      </JobRegistryCardContext.Provider>
    </Card>
  );
}

JobRegistryCard.Header = Header;
JobRegistryCard.Itinerary = Itinerary;
JobRegistryCard.Company = Company;
JobRegistryCard.Unit = Unit;
JobRegistryCard.Progress = JobProgress;
JobRegistryCard.Score = Score;
JobRegistryCard.Actions = Actions;

function Header() {
  const jobReg = useCardContext();
  assert.notNull(jobReg.startDate, "jobReg.startDate");

  return (
    <CardHeader className="gap-4">
      <View className="flex-row items-center justify-between">
        <CardTitle>Registro {jobReg.serverId ?? `${jobReg.id}L`}</CardTitle>
        {jobReg.endDate != null && (
          <Badge variant="secondary">
            <Text>Terminado</Text>
          </Badge>
        )}
      </View>
      <View>
        <CardDescription>
          {formatDateTime(jobReg.startDate)} -{" "}
          {jobReg.endDate ? formatDateTime(jobReg.endDate) : "Presente"}
        </CardDescription>
        {jobReg.userName && (
          <CardDescription>{jobReg.userName}</CardDescription>
        )}
      </View>
    </CardHeader>
  );
}

type KVProps = {
  k: ReactNode;
  v: ReactNode;
};
function KV({ k, v }: KVProps) {
  return (
    <View className="flex-row items-center gap-3">
      {k}
      {v}
    </View>
  );
}

function Itinerary() {
  const jobReg = useCardContext();
  assert.notNull(jobReg.itineraryName, "jobReg.itineraryName");

  return (
    <KV
      k={<ClipboardCheck className="color-muted-foreground" size={18} />}
      v={<Text>{jobReg.itineraryName}</Text>}
    />
  );
}

function Company() {
  const jobReg = useCardContext();
  assert.notNull(jobReg.companyName, "jobReg.companyName");

  return (
    <KV
      k={<Building2 className="color-muted-foreground" size={18} />}
      v={<Text>{jobReg.companyName}</Text>}
    />
  );
}

function Unit() {
  const jobReg = useCardContext();
  assert.notNull(jobReg.vehicleName, "jobReg.vehicleName");

  return (
    <KV
      k={<BusFront className="color-muted-foreground" size={18} />}
      v={<Text>{jobReg.vehicleName}</Text>}
    />
  );
}

function JobProgress() {
  const jobReg = useCardContext();
  assert.notNull(jobReg.totalActivities, "jobReg.totalActivities");
  assert.notNull(jobReg.completedActivities, "jobReg.completedActivities");

  const progress = Math.round(
    (jobReg.completedActivities / jobReg.totalActivities) * 100,
  );

  return (
    <View className="w-full">
      <View className="items-end mb-1">
        <Text className="text-muted-foreground text-sm">
          {jobReg.completedActivities} / {jobReg.totalActivities} Tareas
        </Text>
      </View>
      <Progress value={progress} className="h-2" />
    </View>
  );
}

function Score() {
  const jobReg = useCardContext();
  assert.notNull(jobReg.score, "jobReg.score");

  const filledClass = "color-warning fill-warning";
  const emptyClass = "color-muted-foreground";

  return (
    <View className="w-full flex-row py-2 gap-1">
      <Star key={1} className={jobReg.score >= 1 ? filledClass : emptyClass} />
      <Star key={2} className={jobReg.score >= 2 ? filledClass : emptyClass} />
      <Star key={3} className={jobReg.score >= 3 ? filledClass : emptyClass} />
      <Star key={4} className={jobReg.score >= 4 ? filledClass : emptyClass} />
      <Star key={5} className={jobReg.score >= 5 ? filledClass : emptyClass} />
    </View>
  );
}

type ActionsProps = {
  endHref: LinkProps["href"];
  registryHref: LinkProps["href"];
};

function Actions({ endHref, registryHref }: ActionsProps) {
  return (
    <CardFooter className="justify-between gap-3">
      <Link href={endHref} asChild>
        <Button variant="secondary" className="flex-1">
          <Text>Terminar</Text>
        </Button>
      </Link>
      <Link href={registryHref} asChild>
        <Button variant="default" className="flex-1">
          <Text>Registro</Text>
        </Button>
      </Link>
    </CardFooter>
  );
}
