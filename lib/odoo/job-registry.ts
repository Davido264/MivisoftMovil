import { formatOdoo, parseOdoo } from "@/lib/date";
import { transformError } from "@/lib/result";
import { Env, RemoteJobReg } from "./env";
import { Environment } from "./_env";

export { RemoteJobReg } from "./env";

export async function fetchJobRegistries(env: Environment<Env>, maxAge: Date) {
  try {
    const registries = await env["technical_support.job_registry"].searchRead(
      [["create_date", ">", formatOdoo(maxAge)]],
      [
        "id",
        "itinerary_id",
        "user_id",
        "start_datetime",
        "end_datetime",
        "observation",
        "score",
        "fleet_vehicle_id",
        "company_id",
        "write_date",
      ],
      { order: "create_date DESC" },
    );

    return registries.map(
      (reg: any) =>
        ({
          id: reg.id as number,
          itinerary_id: reg.itinerary_id[0] as number,
          user_id: reg.user_id[0] as number,
          start_datetime: reg.start_datetime as string,
          end_datetime: reg.end_datetime as string | false,
          observation: reg.observation as string,
          score: reg.score ? Number(reg.score) : null,
          fleet_vehicle_id: reg.fleet_vehicle_id[0] as number,
          company_id: reg.company_id[0] as number,
          lastmod: parseOdoo(reg.write_date),
        }) as RemoteJobReg,
    );
  } catch (error) {
    throw transformError(error, "Error al obtener registros de trabajos");
  }
}

export async function writeJobRegistry(
  env: Environment<Env>,
  id: number,
  record: RemoteJobReg | { activity_registries: any[] },
) {
  try {
    await env["technical_support.job_registry"].update(id, {
      ...record,
      // @ts-ignore
      score: "score" in record && record.score ? `${record.score}` : undefined,
    });
    return id;
  } catch (error) {
    throw transformError(error, "Error al actualizar registro de trabajo", {
      record,
    });
  }
}

export async function createJobRegistry(
  env: Environment<Env>,
  record: RemoteJobReg,
) {
  try {
    return await env["technical_support.job_registry"].create({
      ...record,
      // @ts-ignore
      score: record.score ? `${record.score}` : undefined,
    });
  } catch (error) {
    throw transformError(error, "Error al crear registro de trabajo", {
      record,
    });
  }
}

export async function writeEndDateTime(
  env: Environment<Env>,
  id: number,
  endDateTime: string,
) {
  try {
    // @ts-ignore
    return await env["technical_support.job_registry"].update(id, {
      end_datetime: endDateTime,
    });
  } catch (error) {
    throw transformError(error, "Error al actualizar la fecha de finalización");
  }
}

export async function getJobRegistryOdooIds(
  env: Environment<Env>,
  userId: number,
  uuid: string[],
) {
  try {
    const map = await env["technical_support.job_registry"].searchRead(
      [
        ["uuid", "in", uuid],
        ["user_id", "=", userId],
      ],
      ["id", "uuid"],
    );
    return new Map(map.map((r) => [r.uuid, r.id])) as Map<string, number>;
  } catch (error) {
    throw transformError(error, "Error al obtener id remoto", {
      function: "getJobRegistryOdooIds",
    });
  }
}
