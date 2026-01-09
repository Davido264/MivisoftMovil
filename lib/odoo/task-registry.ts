import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { RemoteActivityRegistry } from "@/lib/odoo/act-registry";
import { parseOdoo } from "@/lib/date";
import { Logger } from "@/lib/logger";
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

const odooModelRegistry = "technical_support.task_registry";
const odooModelResource = "technical_support.task";

export async function fetchTaskRegistries(
  client: OdooJSONRpc,
  actRegistries: RemoteActivityRegistry[],
) {
  try {
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
  } catch (error) {
    throw transformError(error, "Error al obtener registros de tareas");
  }
}

export async function fetchTasks(client: OdooJSONRpc, activityIds: number[]) {
  try {
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
  } catch (error) {
    throw transformError(error, "Error al obtener tareas");
  }
}

export async function writeTaskRegistry(
  client: OdooJSONRpc,
  id: number,
  record: RemoteTaskRegistry,
) {
  try {
    await client.update(odooModelRegistry, id, record);
    return id;
  } catch (error) {
    throw transformError(error, "Error al actualizar registro de tarea", {
      record,
    });
  }
}

export async function createTaskRegistry(
  client: OdooJSONRpc,
  record: RemoteTaskRegistry,
) {
  try {
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
  } catch (error) {
    throw transformError(error, "Error al actualizar registro de tarea", {
      record,
    });
  }
}
