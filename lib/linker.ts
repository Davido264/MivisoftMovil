import { formatOdoo } from "./date";
import { ActivityRegistrySelect } from "@/lib/db/schema/activity-registry";
import { TaskRegistrySelect } from "@/lib/db/schema/task-registry";
import { JobRegistrySelect } from "@/lib/db/schema/job-registry";
import { WorktimeRegistrySelect } from "@/lib/db/schema/worktime-registry";

export class Linker {
  remoteLinks: Set<number> = new Set<number>();
  localLinks: Set<number> = new Set<number>();

  jobRegistryIds: Map<string, number> = new Map<string, number>();
  activityRegistryIds: Map<string, number> = new Map<string, number>();
  taskRegistryIds: Map<string, number> = new Map<string, number>();

  worktimeRegistries: WorktimeRegistrySelect[] = [];
  jobRegistries: JobRegistrySelect[] = [];
  activityRegistries: ActivityRegistrySelect[] = [];
  taskRegistries: TaskRegistrySelect[] = [];

  getJobRegistryCommands() {
    const result = [];
    for (const jobReg of this.jobRegistries) {
      if (!this.localLinks.has(jobReg.id)) {
        continue;
      }

      if (this.jobRegistryIds.has(jobReg.uuid)) {
        const odooId = this.jobRegistryIds.get(jobReg.uuid)!;
        if (!this.remoteLinks.has(odooId)) {
          result.push([4, odooId, 0]);
        }
      }

      const command = this.jobRegistryIds.has(jobReg.uuid) ? 1 : 0;
      const id = this.jobRegistryIds.get(jobReg.uuid) ?? 0;
      const activities = this.getActivityRegistryCommands(jobReg.id);

      result.push([
        command,
        id,
        {
          itinerary_id: jobReg.itineraryId,
          user_id: jobReg.userId,
          start_datetime: formatOdoo(jobReg.startDate),
          end_datetime:
            jobReg.endDate != null ? formatOdoo(jobReg.endDate) : undefined,
          observation: jobReg.observation,
          score: jobReg.score != null ? `${jobReg.score}` : "0",
          fleet_vehicle_id: jobReg.vehicleId,
          company_id: jobReg.companyId,
          activity_registry_ids: activities,
          uuid: jobReg.uuid,
        },
      ]);
    }
    return result;
  }

  getActivityRegistryCommands(jobRegId: number) {
    const result = [];
    for (const activityReg of this.activityRegistries) {
      if (activityReg.jobRegistryId !== jobRegId) {
        continue;
      }

      const tasks = this.getTaskRegistryCommands(activityReg.id);

      const command = this.activityRegistryIds.has(activityReg.uuid) ? 1 : 0;
      const id = this.activityRegistryIds.get(activityReg.uuid) ?? 0;

      result.push([
        command,
        id,
        {
          activity_id: activityReg.activityId,
          lat: activityReg.lat,
          lng: activityReg.lng,
          observation: activityReg.observation,
          task_registry_ids: tasks,
          uuid: activityReg.uuid,
        },
      ]);
    }

    return result;
  }

  getTaskRegistryCommands(actRegId: number) {
    const tasks = [];
    for (const taskReg of this.taskRegistries) {
      if (taskReg.activityRegistryId !== actRegId) {
        continue;
      }

      const command = this.taskRegistryIds.has(taskReg.uuid) ? 1 : 0;
      const id = this.taskRegistryIds.get(taskReg.uuid) ?? 0;

      tasks.push([
        command,
        id,
        {
          completed: taskReg.completed,
          completed_date: taskReg.completedDate
            ? formatOdoo(taskReg.completedDate)
            : false,
          observation: taskReg.observation,
          task_id: taskReg.taskId,
          uuid: taskReg.uuid,
        },
      ]);
    }
    return tasks;
  }
}
