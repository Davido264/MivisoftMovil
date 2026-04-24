import {
  Env,
  RemoteActivityRegistry,
  RemoteTaskRegistry,
  RemoteTask,
} from "@/lib/odoo/env";
import { Environment } from "./_env";
import { parseOdoo } from "@/lib/date";
import { Logger } from "@/lib/logger";
import { transformError } from "@/lib/result";

export { RemoteTaskRegistry, RemoteTask } from "./env";

const logger = Logger.getLogger("");

export async function fetchTaskRegistries(
  env: Environment<Env>,
  actRegistries: RemoteActivityRegistry[],
) {
  if (actRegistries.length === 0) {
    return [];
  }

  try {
    const registries = await env["technical_support.task_registry"].searchRead(
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

export async function fetchTasks(env: Environment<Env>, activityIds: number[]) {
  try {
    const tasks = await env["technical_support.task"].searchRead(
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
  env: Environment<Env>,
  id: number,
  record: Partial<Omit<RemoteTaskRegistry, "id">>,
) {
  try {
    await env["technical_support.task_registry"].update(id, record);
    return id;
  } catch (error) {
    throw transformError(error, "Error al actualizar registro de tarea", {
      record,
    });
  }
}

export async function createTaskRegistry(
  env: Environment<Env>,
  record: Partial<Omit<RemoteTaskRegistry, "id">>,
) {
  try {
    const existing = await env["technical_support.task_registry"].search([
      "&",
      ["activity_registry_id", "=", record.activity_registry_id],
      ["task_id", "=", record.task_id],
    ]);

    if (existing.length !== 1) {
      logger.warn(
        "No se ha encontrado una tarea o se encontraron varias, creando",
      );
      return await env["technical_support.task_registry"].create(record);
    }

    await env["technical_support.task_registry"].update(existing[0], record);
    return existing[0];
  } catch (error) {
    throw transformError(error, "Error al actualizar registro de tarea", {
      record,
    });
  }
}

export async function getTaskRegistryOdooIds(
  env: Environment<Env>,
  userId: number,
  uuid: string[],
) {
  try {
    const map = await env["technical_support.task_registry"].searchRead(
      [
        ["uuid", "in", uuid],
        ["uid", "=", userId],
      ],
      ["id", "uuid"],
    );
    return new Map(map.map((r) => [r.uuid, r.id])) as Map<string, number>;
  } catch (error) {
    throw transformError(error, "Error al obtener id remoto", {
      function: "getTaskRegistryOdooIds",
    });
  }
}
