import LoadingIndicator from "@/components/ui/loading-indicator";
import { useSession } from "@/lib/store/application-state";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IdNamedList } from "@/components/ui/id-named-list";
import { Diff } from "@/components/lib/icons/Diff";
import { Images } from "@/components/lib/icons/Images";
import { CheckCheck } from "@/components/lib/icons/CheckCheck";
import { CircleFadingArrowUp } from "@/components/lib/icons/CircleFadingArrowUp";
import { Button } from "@/components/ui/button";
import { Link } from "expo-router";
import { ScrollView, View } from "react-native";
import { GitPullRequestClosed } from "@/components/lib/icons/GitPullRequestClosed";
import { getAllPendingWorktimeRegistries } from "@/lib/db/queries/worktime-registry";
import { getAllPendingTaskRegistries } from "@/lib/db/queries/task-registries";
import { getAllPendingActivityRegistries } from "@/lib/db/queries/activity-registries";
import { WorktimeRegistrySelect } from "@/lib/db/schema/worktime-registry";
import { JobRegistrySelect } from "@/lib/db/schema/job-registry";
import { ActivityRegistrySelect } from "@/lib/db/schema/activity-registry";
import { TaskRegistrySelect } from "@/lib/db/schema/task-registry";
import { remotifyWorktimeRegistry } from "@/lib/db/actions/worktime-registry";
import { remotifyTaskRegistry } from "@/lib/db/actions/task-registry";
import { remotifyActivityRegistry } from "@/lib/db/actions/activity-registry";
import { remotifyJobRegistry } from "@/lib/db/actions/job-registry";
import { getAllPendingJobRegistries } from "@/lib/db/queries/job-registry";

export default function Backlog() {
  const userId = useSession((session) => session.uid);

  const {
    data: worktimes,
    updatedAt: uWorktime,
    error: eWorktime,
  } = useLiveQuery(getAllPendingWorktimeRegistries(userId));

  const {
    data: jobRegs,
    updatedAt: uJobReg,
    error: eJobReg,
  } = useLiveQuery(getAllPendingJobRegistries(userId));

  const {
    data: actRegs,
    updatedAt: uActReg,
    error: eActReg,
  } = useLiveQuery(getAllPendingActivityRegistries(userId));

  const {
    data: taskRegs,
    updatedAt: uTaskReg,
    error: eTaskReg,
  } = useLiveQuery(getAllPendingTaskRegistries(userId));

  if (!uWorktime || !uJobReg || !uActReg || !uTaskReg) {
    return <LoadingIndicator className="flex-1 justify-center items-center" />;
  }

  return (
    <IdNamedList
      data={transform(worktimes, jobRegs, actRegs, taskRegs)}
      error={[eWorktime, eJobReg, eActReg, eTaskReg].find((e) => e)?.message}
    >
      <IdNamedList.ElementList ElementItem={PendingItem} bottomSafe />
    </IdNamedList>
  );
}

function PendingItem(item: PendingRegistryState) {
  const userName = useSession((session) => session.name);
  let model = undefined;
  let id = undefined;

  if (item.jobRegistryId) {
    model = "jobreg";
    id = item.jobRegistryId;
  } else if (item.activityRegistryId) {
    model = "actreg";
    id = item.activityRegistryId;
  } else if (item.worktimeRegistryId) {
    model = "worktime";
    id = item.worktimeRegistryId;
  }

  return (
    <View className="w-full p-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Diff size={16} className="color-muted-foreground" />
            <CardTitle>{item.name}</CardTitle>
          </View>
          <View className="flex-row items-center gap-2">
            {item.conflicting != null && (
              <View className="h-10 w-10 flex items-center justify-center">
                <GitPullRequestClosed
                  aria-label="Cambio con conflictos"
                  size={16}
                  className="color-foreground h-10 w-10"
                />
              </View>
            )}
            <View className="h-10 w-10 flex items-center justify-center">
              {item.remote ? (
                <CheckCheck
                  aria-label="Cambio sincronizado"
                  size={16}
                  className="color-foreground h-10 w-10"
                />
              ) : (
                <CircleFadingArrowUp
                  aria-label="Cambio sin sincronizar"
                  size={16}
                  className="color-foreground"
                />
              )}
            </View>
            {model && id && (
              <Link
                href={{ pathname: "/gallery", params: { model, id } }}
                asChild
              >
                <Button variant="ghost" size="icon">
                  <Images size={16} className="color-foreground" />
                </Button>
              </Link>
            )}
          </View>
        </CardHeader>
        <CardContent className="flex-col gap-2">
          <DeltaView delta={item.delta} userName={userName} />
          {item.conflicting != null && (
            <DeltaView delta={item.conflicting} userName={userName} />
          )}
        </CardContent>
      </Card>
    </View>
  );
}

function DeltaView({
  delta,
  userName,
}: {
  delta: Record<string, unknown>;
  userName?: string;
}) {
  return (
    <View className="w-full flex-col gap-1">
      <Text className="text-muted-foreground">{userName}</Text>
      <ScrollView
        className="w-full bg-background rounded-md"
        contentContainerClassName="min-w-full p-2"
        horizontal
        bounces={false}
      >
        <Text className="text-sm" style={{ fontFamily: "SpaceMono" }}>
          {JSON.stringify(delta, null, 2)}
        </Text>
      </ScrollView>
    </View>
  );
}

function transform(
  w: WorktimeRegistrySelect[],
  j: JobRegistrySelect[],
  a: ActivityRegistrySelect[],
  t: TaskRegistrySelect[],
): PendingRegistryState[] {
  const result: PendingRegistryState[] = [];

  let i = 0;
  for (const wtime of w) {
    result.push({
      id: i++,
      name: wtime.odooId ? `${wtime.odooId}` : `${wtime.id}L`,
      worktimeRegistryId: wtime.id,
      delta: remotifyWorktimeRegistry(wtime),
      remote: wtime.lastsync != null && wtime.lastsync >= wtime.lastmod,
      conflicting: null,
    });
  }

  for (const job of j) {
    result.push({
      id: i++,
      name: job.odooId ? `${job.odooId}` : `${job.id}L`,
      jobRegistryId: job.id,
      delta: remotifyJobRegistry(job),
      remote: job.lastsync != null && job.lastsync >= job.lastmod,
      conflicting: null,
    });
  }

  for (const act of a) {
    result.push({
      id: i++,
      name: act.odooId ? `${act.odooId}` : `${act.id}L`,
      activityRegistryId: act.id,
      delta: remotifyActivityRegistry(act),
      remote: act.lastsync != null && act.lastsync >= act.lastmod,
      conflicting: null,
    });
  }

  for (const task of t) {
    result.push({
      id: i++,
      name: task.odooId ? `${task.odooId}` : `${task.id}L`,
      taskRegistryId: task.id,
      delta: remotifyTaskRegistry(task),
      remote: task.lastsync != null && task.lastsync >= task.lastmod,
      conflicting: null,
    });
  }

  return result;
}

type PendingRegistryState = {
  id: number;
  name: string;
  worktimeRegistryId?: number;
  jobRegistryId?: number;
  activityRegistryId?: number;
  taskRegistryId?: number;
  delta: Record<string, unknown>;
  remote: boolean;
  conflicting: null;
};
