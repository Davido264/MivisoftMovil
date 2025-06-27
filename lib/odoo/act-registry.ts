import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { RemoteJobReg } from "./job-registry";
import { parseOdoo } from "../date";
import { ResultAsync } from "neverthrow";
import { transformError } from "../result";

export type RemoteActivityRegistry = {
  id: number | undefined;
  job_registry_id: number;
  activity_id: number;
  lat: number;
  lng: number;
  observation: string;
  uid: number;
  lastmod: Date;
};

export type RemoteActivity = {
  id: number | undefined;
  itinerary_id: number;
  name: string;
};

export function fetchActivityRegistries(
  client: OdooJSONRpc,
  jobregs: RemoteJobReg[],
) {
  return ResultAsync.fromPromise(
    _internalFetchActivityRegistries(client, jobregs),
    (e) => transformError(e, "Error al obtener registros de actividades"),
  );
}

export function fetchActivities(client: OdooJSONRpc, itineraryIds: number[]) {
  return ResultAsync.fromPromise(
    _internalFetchActivities(client, itineraryIds),
    (e) => transformError(e, "Error al obtener actividades"),
  );
}

export function writeActivityRegistry(
  client: OdooJSONRpc,
  id: number,
  record: RemoteActivityRegistry,
) {
  return ResultAsync.fromPromise(
    _internalWriteActivityRegistry(client, id, record),
    (e) =>
      transformError(e, "Error al actualizar registro de actividad", record),
  );
}

export function createActivityRegistry(
  client: OdooJSONRpc,
  record: RemoteActivityRegistry,
) {
  return ResultAsync.fromPromise(
    _internalCreateActivityRegistry(client, record),
    (e) => transformError(e, "Error al crear registro de actividad", record),
  );
}

const odooModelRegistry = "technical_support.activity_registry";
async function _internalFetchActivityRegistries(
  client: OdooJSONRpc,
  jobregs: RemoteJobReg[],
) {
  const registries = await client.searchRead(
    odooModelRegistry,
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
}

const odooModelResource = "technical_support.activity";
async function _internalFetchActivities(
  client: OdooJSONRpc,
  itineraryIds: number[],
) {
  const activities = await client.searchRead(
    odooModelResource,
    [["itinerary_id", "in", itineraryIds]],
    ["id", "itinerary_id", "name"],
  );

  return activities.map((act: any) => ({
    id: act.id as number,
    itinerary_id: act.itinerary_id[0] as number,
    name: act.name as string,
  }));
}

async function _internalWriteActivityRegistry(
  client: OdooJSONRpc,
  id: number,
  record: RemoteActivityRegistry,
) {
  await client.update(odooModelRegistry, id, record);
  return id;
}

async function _internalCreateActivityRegistry(
  client: OdooJSONRpc,
  record: RemoteActivityRegistry,
) {
  return await client.create(odooModelRegistry, record);
}
