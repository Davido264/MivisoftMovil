import { Checkbox } from "@/components/ui/checkbox";
import { IdNamedList } from "@/components/ui/id-named-list";
import LoadingIndicator from "@/components/ui/loading-indicator";
import { getActivityTasks } from "@/lib/db/queries/resources";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { NotebookPen } from "@/components/lib/icons/NotebookPen";
import { Send } from "@/components/lib/icons/Send";
import { TaskRegistry } from "@/lib/api/activity-registry";
import { useSharedTaskListStore } from "@/lib/store/tasks-list";
import { useStore } from "zustand";
import assert from "@/lib/assert";
import { useSharedImageListStore } from "@/lib/store/image-list";

export default function ActivityTasks() {
  console.log("render activity tasks");

  const navParams = useLocalSearchParams<{
    actid: string;
    actName: string;
    jobregid: string;
    actregid: string;
    taskStoreKey: string;
    imageStoreKey: string;
  }>();

  assert.notNull(navParams.taskStoreKey);
  assert.notNull(navParams.imageStoreKey);

  const { data, error, updatedAt } = useLiveQuery(
    getActivityTasks(Number(navParams.actid), Number(navParams.actregid || 0)),
  );

  useSharedImageListStore(navParams.imageStoreKey);
  const taskStore = useSharedTaskListStore(navParams.taskStoreKey);
  const currentTasks = useStore(taskStore, (s) => s.tasks);

  if (!navParams.actid || !navParams.actName || !navParams.jobregid) {
    return <Redirect href="/job-registry/all" />;
  }

  if (!updatedAt) {
    return <LoadingIndicator className="flex-1 items-center justify-center" />;
  }

  return (
    <View className="flex-1 gap-2 pb-safe-offset-3">
      <IdNamedList
        data={applySelectedTasks(data ?? [], currentTasks)}
        error={error?.message}
      >
        <IdNamedList.SearchField />
        <View className="w-full px-4">
          <Text className="text-lg">{navParams.actName}</Text>
        </View>
        <IdNamedList.ElementList ElementItem={ElementItem} bottomSafe />
      </IdNamedList>
      <View className="w-full px-4">
        <Link
          href={{
            pathname: "/job-registry/register-activity/form",
            params: navParams,
          }}
          asChild
        >
          <Button variant="secondary" className="flex-row gap-3 items-center">
            <Send className="color-secondary-foreground" size={16} />
            <Text>Registrar Actividad</Text>
          </Button>
        </Link>
      </View>
    </View>
  );
}

function ElementItem(item: {
  id: number;
  name: string;
  completed: boolean;
  observation: string;
  disabled: boolean;
}) {
  const { taskStoreKey, imageStoreKey } = useLocalSearchParams<{
    taskStoreKey: string;
    imageStoreKey: string;
  }>();

  const taskStore = useSharedTaskListStore(taskStoreKey);
  const addTask = useStore(taskStore, (s) => s.addTask);
  const removeTask = useStore(taskStore, (s) => s.removeTask);

  const handleCheckChange = (value: boolean) => {
    if (value) {
      addTask({
        taskId: item.id,
        completedDate: new Date(),
        observation: "",
      });
    } else {
      removeTask(item.id);
    }
  };

  return (
    <View className="w-full flex-row p-4 my-2 items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-3">
        <Checkbox
          checked={item.completed || item.disabled}
          disabled={item.disabled}
          onCheckedChange={handleCheckChange}
        />
        <View className="flex-1 flex-col">
          <Text>{item.name}</Text>
          {item.observation ? (
            <Text className="text-sm text-nowrap text-ellipsis line-clamp-1 text-muted-foreground">
              {item.observation}
            </Text>
          ) : null}
        </View>
      </View>
      <Link
        href={{
          pathname: "/job-registry/register-activity/task-observation",
          params: { taskid: item.id.toString(), taskStoreKey, imageStoreKey },
        }}
        asChild
      >
        <Button variant="outline" size="icon" disabled={item.disabled}>
          <NotebookPen size={14} className="color-foreground" />
        </Button>
      </Link>
    </View>
  );
}

function applySelectedTasks(
  source: {
    id: number;
    name: string;
    completed: boolean;
    observation: string;
    disabled: boolean;
  }[],
  selectedTasks: TaskRegistry[],
) {
  return source.map((task) => {
    if (task.disabled) {
      return task;
    }

    const selectedTask = selectedTasks.find((t) => t.taskId === task.id);
    if (selectedTask) {
      return {
        ...task,
        completed: selectedTask.completedDate !== null,
        observation: selectedTask.observation || "",
      };
    } else {
      return { ...task, completed: false, observation: "" };
    }
  });
}
