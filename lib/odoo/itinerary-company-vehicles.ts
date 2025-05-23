import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";

export type RemoteItinerary = {
  id: number | undefined;
  name: string;
};

export type RemoteVehicle = {
  id: number | undefined;
  company_id: number;
  name: string;
};

export type RemoteCompany = {
  id: number | undefined;
  name: string;
};

const odooModelItinerary = "technical_support.itinerary";
const odooModelVehicle = "fleet.vehicle";
const odooModelCompany = "res.company";

export async function fetchItineraries(client: OdooJSONRpc) {
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

export async function fetchCompanies(client: OdooJSONRpc) {
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

export async function fetchVehicles(client: OdooJSONRpc) {
  const vehicles = await client.searchRead(
    odooModelVehicle,
    [],
    ["id", "display_name", "company_id"],
  );

  return vehicles.map(
    (v: any) =>
      ({
        id: v.id as number,
        name: v.display_name as string,
        company_id: v.company_id[0] as number,
      }) as RemoteVehicle,
  );
}
