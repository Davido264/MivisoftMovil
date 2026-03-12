import { transformError } from "@/lib/result";
import { Env, RemoteVehicle, RemoteCompany, RemoteItinerary } from "./env";
import { Environment } from "./_env";

export { RemoteVehicle, RemoteCompany, RemoteItinerary } from "./env";

export async function fetchItineraries(env: Environment<Env>) {
  try {
    return env["technical_support.itinerary"].searchRead([], ["id", "name"], {
      order: "create_date DESC",
    });
  } catch (error) {
    throw transformError(error, "Error al obtener itinerarios");
  }
}

export async function fetchCompanies(env: Environment<Env>) {
  try {
    return env["res.company"].searchRead([], ["id", "name"]);
  } catch (error) {
    throw transformError(error, "Error al obtener companías");
  }
}

export async function fetchVehicles(env: Environment<Env>) {
  try {
    const vehicles = await env["fleet.vehicle"].searchRead(
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
