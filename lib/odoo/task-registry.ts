import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { RemoteActivityRegistry } from "@/lib/odoo/act-registry";
import { parseOdoo } from "../date";

export type RemoteTaskRegistry = {
  id: number | undefined;
  completed: boolean;
  completed_date: string | false;
  observation: string;
  task_id: number;
  activity_registry_id: number;
  uid: number;
  lastmod: Date;
};

export type RemoteTask = {
  id: number | undefined;
  activity_id: number;
  name: string;
};

const odooModelRegistry = "technical_support.task_registry";
const odooModelResource = "technical_support.task";

export async function fetchTaskRegistries(
  client: OdooJSONRpc,
  actRegistries: RemoteActivityRegistry[],
) {
  const registries = await client.searchRead(
    odooModelRegistry,
    [["activity_registry_id", "in", actRegistries.map((i) => i.id!)]],
    [
      "id",
      "activity_registry_id",
      "completed",
      "completed_date",
      "observation",
      "task_id",
      "write_date",
    ],
    { order: "create_date DESC" },
  );

  const userMap = new Map<number, number>();
  actRegistries.forEach(({ id, uid }) => {
    userMap.set(id!, uid);
  });

  return registries.map(
    (reg: any) =>
      ({
        id: reg.id as number,
        completed: reg.completed as boolean,
        completed_date: reg.completed_date as string | false,
        observation: reg.observation as string,
        task_id: reg.task_id[0] as number,
        activity_registry_id: reg.activity_registry_id[0] as number,
        lastmod: parseOdoo(reg.write_date),
        uid: userMap.get(reg.activity_registry_id[0] as number),
      }) as RemoteTaskRegistry,
  );
}

export async function fetchTasks(client: OdooJSONRpc, activityIds: number[]) {
  const tasks = await client.searchRead(
    odooModelResource,
    [["activity_id", "in", activityIds]],
    ["activity_id", "id", "name"],
  );
  return tasks.map(
    (task: any) =>
      ({
        id: task.id as number,
        activity_id: task.activity_id[0] as number,
        name: task.name as string,
      }) as RemoteTask,
  );
}

export async function writeTaskRegistry(
  client: OdooJSONRpc,
  id: number,
  record: RemoteTaskRegistry,
) {
  return await client.update(odooModelRegistry, id, record);
}

export async function createTaskRegistry(
  client: OdooJSONRpc,
  record: RemoteTaskRegistry,
) {
  return await client.create(odooModelRegistry, record);
}
