import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { ResultAsync } from "neverthrow";
import { transformError } from "@/lib/result";

export type RemoteItinerary = {
  id: number | undefined;
  name: string;
};

export type RemoteVehicle = {
  id: number | undefined;
  company_ids: number[];
  name: string;
};

export type RemoteCompany = {
  id: number | undefined;
  name: string;
};

export function fetchItineraries(client: OdooJSONRpc) {
  return ResultAsync.fromPromise(_internalFetchItineraries(client), (e) =>
    transformError(e, "Error al obtener itinerarios"),
  );
}

export function fetchCompanies(client: OdooJSONRpc) {
  return ResultAsync.fromPromise(_internalFetchCompanies(client), (e) =>
    transformError(e, "Error al obtener companías"),
  );
}

export function fetchVehicles(client: OdooJSONRpc) {
  return ResultAsync.fromPromise(_internalFetchVehicle(client), (e) =>
    transformError(e, "Error al obtener vehículos"),
  );
}

const odooModelItinerary = "technical_support.itinerary";
async function _internalFetchItineraries(client: OdooJSONRpc) {
  const itineraries = await client.searchRead(
    odooModelItinerary,
    [],
    ["id", "name"],
    {
      order: "create_date DESC",
    },
  );

  return itineraries.map(
    (itinerary: any) =>
      ({
        id: itinerary.id as number,
        name: itinerary.name as string,
      }) as RemoteItinerary,
  );
}

const odooModelCompany = "res.company";
async function _internalFetchCompanies(client: OdooJSONRpc) {
  const companies = await client.searchRead(
    odooModelCompany,
    [],
    ["id", "name"],
  );
  return companies.map(
    (c: any) =>
      ({ id: c.id as number, name: c.name as string }) as RemoteCompany,
  );
}

const odooModelVehicle = "fleet.vehicle";
async function _internalFetchVehicle(client: OdooJSONRpc) {
  const vehicles = await client.searchRead(
    odooModelVehicle,
    [],
    ["id", "municipal_registry", "unit_number", "company_ids"],
  );

  return vehicles.map(
    (v: any) =>
      ({
        id: v.id as number,
        name: `${v.unit_number} | ${v.municipal_registry}`,
        company_ids: v.company_ids as number[],
      }) as RemoteVehicle,
  );
}
