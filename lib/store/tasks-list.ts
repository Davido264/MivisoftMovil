import { TaskRegistry } from "@/lib/api/activity-registry";
import { alloc, free } from "./repo";
import { useEffect, useState } from "react";
import { StoreApi } from "zustand";

export type TaskListStore = {
  tasks: TaskRegistry[];
  addTask: (task: TaskRegistry) => void;
  removeTask: (taskid: number) => void;
  addTaskObservation: (taskId: number, observation: string) => void;
};

export function useSharedTaskListStore(key: string) {
  const [store] = useState(() =>
    alloc<TaskListStore>(key, (set, get) => ({
      tasks: [],
      addTask: (task) => set({ tasks: [task, ...get().tasks] }),

      removeTask: (taskId) =>
        set({ tasks: get().tasks.filter((t) => t.taskId !== taskId) }),

      addTaskObservation: (taskId, observation) => {
        const current = get().tasks.find((t) => t.taskId !== taskId);
        if (!current) {
          get().addTask({ taskId, observation, completedDate: new Date() });
          return;
        }

        set({
          tasks: get().tasks.map((t) => ({
            ...t,
            ...(t.taskId === taskId
              ? { observation, completedDate: new Date() }
              : {}),
          })),
        });
      },
    })),
  );
  useEffect(() => () => free(key), [key]);
  return store as StoreApi<TaskListStore>;
}
