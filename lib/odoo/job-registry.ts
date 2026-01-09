import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { formatOdoo, parseOdoo } from "@/lib/date";
import { transformError } from "@/lib/result";

export type RemoteJobReg = {
  id?: number;
  itinerary_id: number;
  user_id: number;
  start_datetime: string;
  end_datetime?: string;
  observation: string;
  score?: number;
  fleet_vehicle_id: number;
  company_id: number;
  lastmod: Date;
};

const odooModel = "technical_support.job_registry";

export async function fetchJobRegistries(client: OdooJSONRpc, maxAge: Date) {
  try {
    const registries = await client.searchRead(
      odooModel,
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
  client: OdooJSONRpc,
  id: number,
  record: RemoteJobReg,
) {
  try {
    await client.update(odooModel, id, {
      ...record,
      score: record.score ? `${record.score}` : undefined,
    });
    return id;
  } catch (error) {
    throw transformError(error, "Error al actualizar registro de trabajo", {
      record,
    });
  }
}

export async function createJobRegistry(
  client: OdooJSONRpc,
  record: RemoteJobReg,
) {
  try {
    return await client.create(odooModel, {
      ...record,
      score: record.score ? `${record.score}` : undefined,
    });
  } catch (error) {
    throw transformError(error, "Error al crear registro de trabajo", {
      record,
    });
  }
}

export async function writeEndDateTime(
  client: OdooJSONRpc,
  id: number,
  endDateTime: string,
) {
  try {
    return await client.update(odooModel, id, { end_datetime: endDateTime });
  } catch (error) {
    throw transformError(error, "Error al actualizar la fecha de finalización");
  }
}
