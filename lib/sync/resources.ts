import db, { transBehavior } from "../db";
import {
  RemoteCompany,
  RemoteItinerary,
  RemoteVehicle,
} from "@/lib/odoo/itinerary-company-vehicles";
import { RemoteUser } from "@/lib/odoo/users";
import {
  removeUserSession,
  deleteNonRemoteUsers,
  upsertRemoteUsers,
} from "@/lib/db/actions/users-session";
import {
  deleteNonRemoteCompanies,
  deleteNonRemoteItineraries,
  deleteNonRemoteVehicles,
  upsertCompanies,
  upsertItineraries,
  upsertVehicles,
} from "@/lib/db/actions/resources";
import { Logger } from "@/lib/logger";

const logger = Logger.getLogger("SYNC::RESOURCES")

export async function applyRemoteVehicleChange(vehicles: RemoteVehicle[]) {
  return db.transaction(
    async (tx) => {
      logger.info("Actualizando vechículos")
      await upsertVehicles(vehicles, tx);
      await deleteNonRemoteVehicles(
        vehicles.map((i) => i.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );
}

export async function applyRemoteCompanyChange(companies: RemoteCompany[]) {
  return db.transaction(
    async (tx) => {
      logger.info("Actualizando companías")
      await upsertCompanies(companies, tx);
      await deleteNonRemoteCompanies(
        companies.map((i) => i.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );
}

export async function applyRemoteUsersChange(users: RemoteUser[]) {
  const currentUserId = await db.transaction(
    async (tx) => {
      logger.info("Actualizando usuarios")
      await upsertRemoteUsers(users, tx);
      return await deleteNonRemoteUsers(
        users.map((i) => i.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );

  if (currentUserId !== undefined) {
    await removeUserSession(currentUserId);
  }
}

export async function applyRemoteItineraryChange(
  itineraries: RemoteItinerary[],
) {
  return db.transaction(
    async (tx) => {
      logger.info("Actualizando Itinerarios")
      await upsertItineraries(itineraries, tx);
      await deleteNonRemoteItineraries(
        itineraries.map((it) => it.id!),
        tx,
      );
    },
    { behavior: transBehavior },
  );
}
