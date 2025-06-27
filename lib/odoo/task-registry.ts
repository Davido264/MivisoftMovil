import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { RemoteActivityRegistry } from "@/lib/odoo/act-registry";
import { parseOdoo } from "@/lib/date";
import { Logger } from "@/lib/logger";
import { ResultAsync } from "neverthrow";
import { transformError } from "@/lib/result";

const logger = Logger.getLogger("");

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

export function fetchTaskRegistries(
  client: OdooJSONRpc,
  actRegistries: RemoteActivityRegistry[],
) {
  return ResultAsync.fromPromise(
    _internalFetchTaskRegistries(client, actRegistries),
    (e) => transformError(e, "Error al obtener registros de tareas"),
  );
}

export function fetchTasks(client: OdooJSONRpc, activityIds: number[]) {
  return ResultAsync.fromPromise(
    _internfalFetchTasks(client, activityIds),
    (e) => transformError(e, "Error al obtener tareas"),
  );
}

export function writeTaskRegistry(
  client: OdooJSONRpc,
  id: number,
  record: RemoteTaskRegistry,
) {
  return ResultAsync.fromPromise(
    _internalWriteTaskRegistry(client, id, record),
    (e) => transformError(e, "Error al actualizar registro de tarea", record),
  );
}

export function createTaskRegistry(
  client: OdooJSONRpc,
  record: RemoteTaskRegistry,
) {
  return ResultAsync.fromPromise(
    _internalCreateTaskRegistry(client, record),
    (e) => transformError(e, "Error al actualizar registro de tarea", record),
  );
}

const odooModelRegistry = "technical_support.task_registry";
async function _internalFetchTaskRegistries(
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

const odooModelResource = "technical_support.task";
async function _internfalFetchTasks(
  client: OdooJSONRpc,
  activityIds: number[],
) {
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

async function _internalWriteTaskRegistry(
  client: OdooJSONRpc,
  id: number,
  record: RemoteTaskRegistry,
) {
  await client.update(odooModelRegistry, id, record);
  return id;
}

async function _internalCreateTaskRegistry(
  client: OdooJSONRpc,
  record: RemoteTaskRegistry,
) {
  const existing = await client.search(odooModelRegistry, [
    "&",
    ["activity_registry_id", "=", record.activity_registry_id],
    ["task_id", "=", record.task_id],
  ]);

  if (existing.length !== 1) {
    logger.warn(
      "No se ha encontrado una tarea o se encontraron varias, creando",
    );
    return await client.create(odooModelRegistry, record);
  }

  await client.update(odooModelRegistry, existing[0], record);
  return existing[0];
}
