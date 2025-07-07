import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { formatOdoo, parseOdoo } from "@/lib/date";
import { ResultAsync } from "neverthrow";
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

export function fetchJobRegistries(client: OdooJSONRpc, maxAge: Date) {
  return ResultAsync.fromPromise(
    _internalFetchJobRegistries(client, maxAge),
    (e) => transformError(e, "Error al obtener registros de trabajos"),
  );
}

export function writeJobRegistry(
  client: OdooJSONRpc,
  id: number,
  record: RemoteJobReg,
) {
  return ResultAsync.fromPromise(
    _internalWriteJobRegistry(client, id, record),
    (e) => transformError(e, "Error al actualizar registro de trabajo", record),
  );
}

export function createJobRegistry(client: OdooJSONRpc, record: RemoteJobReg) {
  return ResultAsync.fromPromise(
    _internalCreateJobRegistry(client, record),
    (e) => transformError(e, "Error al crear registro de trabajo", record),
  );
}

export function writeEndDateTime(
  client: OdooJSONRpc,
  id: number,
  endDateTime: string,
) {
  return ResultAsync.fromPromise(
    _internalWriteDateTime(client, id, endDateTime),
    (e) => transformError(e, "Error al actualizar la fecha de finalización"),
  );
}

const odooModel = "technical_support.job_registry";
async function _internalFetchJobRegistries(client: OdooJSONRpc, maxAge: Date) {
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
}

async function _internalWriteJobRegistry(
  client: OdooJSONRpc,
  id: number,
  record: RemoteJobReg,
) {
  await client.update(odooModel, id, {
    ...record,
    score: record.score ? `${record.score}` : undefined,
  });
  return id;
}

async function _internalWriteDateTime(
  client: OdooJSONRpc,
  id: number,
  endDateTime: string,
) {
  return await client.update(odooModel, id, { end_datetime: endDateTime });
}

async function _internalCreateJobRegistry(
  client: OdooJSONRpc,
  record: RemoteJobReg,
) {
  return await client.create(odooModel, {
    ...record,
    score: record.score ? `${record.score}` : undefined,
  });
}
