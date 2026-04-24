import { parseOdoo } from "../date";
import { transformError } from "../result";
import {
  Env,
  RemoteActivityRegistry,
  RemoteActivity,
  RemoteJobReg,
} from "./env";
import { Environment } from "./_env";

export { RemoteActivityRegistry, RemoteActivity } from "./env";

export async function fetchActivityRegistries(
  env: Environment<Env>,
  jobregs: RemoteJobReg[],
) {
  if (jobregs.length === 0) {
    return [];
  }

  try {
    const registries = await env[
      "technical_support.activity_registry"
    ].searchRead(
      [["job_registry_id", "in", jobregs.map((i) => i.id!)]],
      [
        "id",
        "job_registry_id",
        "lat",
        "lng",
        "observation",
        "activity_id",
        "write_date",
      ],
      { order: "create_date DESC" },
    );

    const userMap = new Map<number, number>();
    jobregs.forEach(({ id, user_id }) => {
      userMap.set(id!, user_id);
    });

    return registries.map(
      (reg: any) =>
        ({
          id: reg.id as number,
          job_registry_id: reg.job_registry_id[0] as number,
          activity_id: reg.activity_id[0] as number,
          lat: reg.lat as number,
          lng: reg.lng as number,
          observation: reg.observation as string,
          uid: userMap.get(reg.job_registry_id[0] as number),
          lastmod: parseOdoo(reg.write_date!),
        }) as RemoteActivityRegistry,
    );
  } catch (error) {
    throw transformError(error, "Error al obtener registros de actividades");
  }
}

export async function fetchActivities(
  env: Environment<Env>,
  itineraryIds: number[],
) {
  try {
    const activities = await env["technical_support.activity"].searchRead(
      [["itinerary_id", "in", itineraryIds]],
      ["id", "itinerary_id", "name"],
    );

    return activities.map((act: any) => ({
      id: act.id as number,
      itinerary_id: act.itinerary_id[0] as number,
      name: act.name as string,
    }));
  } catch (error) {
    throw transformError(error, "Error al obtener actividades");
  }
}

export async function writeActivityRegistry(
  env: Environment<Env>,
  id: number,
  record: RemoteActivityRegistry,
) {
  try {
    await env["technical_support.activity_registry"].update(id, record);
    return id;
  } catch (error) {
    throw transformError(error, "Error al actualizar registro de actividad", {
      record,
    });
  }
}

export async function createActivityRegistry(
  env: Environment<Env>,
  record: RemoteActivityRegistry,
) {
  try {
    return await env["technical_support.activity_registry"].create(record);
  } catch (error) {
    throw transformError(error, "Error al crear registro de actividad", {
      record,
    });
  }
}

export async function getActivityRegistryOdooIds(
  env: Environment<Env>,
  userId: number,
  uuid: string[],
) {
  try {
    const map = await env["technical_support.activity_registry"].searchRead(
      [
        ["uuid", "in", uuid],
        ["uid", "=", userId],
      ],
      ["id", "uuid"],
    );
    return new Map(map.map((r) => [r.uuid, r.id])) as Map<string, number>;
  } catch (error) {
    throw transformError(error, "Error al obtener id remoto", {
      function: "getActivityRegistryOdooIds",
    });
  }
}
