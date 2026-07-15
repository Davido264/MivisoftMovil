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

    // Solo se crea si NO existe ninguna. Si ya hay 1+ (incluso duplicados
    // previos), se reutiliza la primera y se actualiza: nunca se añade otra,
    // así el sync es idempotente y no amplifica duplicados ya creados.
    if (existing.length === 0) {
      return await env["technical_support.task_registry"].create(record);
    }

    if (existing.length > 1) {
      logger.warn("Tarea duplicada en Odoo, reutilizando la primera", {
        count: existing.length,
        activity_registry_id: record.activity_registry_id,
        task_id: record.task_id,
      });
    }

    await env["technical_support.task_registry"].update(existing[0], record);
    return existing[0];
  } catch (error) {
    throw transformError(error, "Error al actualizar registro de tarea", {
      record,
    });
  }
}

