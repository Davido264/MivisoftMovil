import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
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

const odooModelItinerary = "technical_support.itinerary";
const odooModelCompany = "res.company";
const odooModelVehicle = "fleet.vehicle";

export async function fetchItineraries(client: OdooJSONRpc) {
  try {
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
  } catch (error) {
    throw transformError(error, "Error al obtener itinerarios");
  }
}

export async function fetchCompanies(client: OdooJSONRpc) {
  try {
    const companies = await client.searchRead(
      odooModelCompany,
      [],
      ["id", "name"],
    );
    return companies.map(
      (c: any) =>
        ({ id: c.id as number, name: c.name as string }) as RemoteCompany,
    );
  } catch (error) {
    throw transformError(error, "Error al obtener companías");
  }
}

export async function fetchVehicles(client: OdooJSONRpc) {
  try {
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
  } catch (error) {
    throw transformError(error, "Error al obtener vehículos");
  }
}
