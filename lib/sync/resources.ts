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
import { transformError } from "../result";

const logger = Logger.getLogger("SYNC::RESOURCES");

export async function applyRemoteVehicleChange(vehicles: RemoteVehicle[]) {
  const pop = Logger.startSubStackTrace("resources::applyRemoteVehicleChange");
  try {
    await db.transaction(
      async (tx) => {
        logger.verbose("Actualizando vechículos");
        await upsertVehicles(vehicles, tx);
        await deleteNonRemoteVehicles(
          vehicles.map((i) => i.id!),
          tx,
        );
      },
      { behavior: transBehavior },
    );
  } catch (e) {
    throw transformError(e, "Error al actualizar vecículos", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

export async function applyRemoteCompanyChange(companies: RemoteCompany[]) {
  const pop = Logger.startSubStackTrace("resources::applyRemoteCompanyChange");
  try {
    await db.transaction(
      async (tx) => {
        logger.verbose("Actualizando companías");
        await upsertCompanies(companies, tx);
        await deleteNonRemoteCompanies(
          companies.map((i) => i.id!),
          tx,
        );
      },
      { behavior: transBehavior },
    );
  } catch (e) {
    throw transformError(e, "Error al actualizar companías", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

export async function applyRemoteUsersChange(users: RemoteUser[]) {
  const pop = Logger.startSubStackTrace("resources::applyRemoteUsersChange");
  try {
    const currentUserId = await db.transaction(
      async (tx) => {
        logger.verbose("Actualizando usuarios");
        await upsertRemoteUsers(users, tx);
        return await deleteNonRemoteUsers(
          users.map((i) => i.id!),
          tx,
        );
      },
      { behavior: transBehavior },
    );

    if (currentUserId !== undefined) {
      return await removeUserSession(currentUserId);
    }
  } catch (e) {
    throw transformError(e, "Error al actualizar los usuarios actuales", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

export async function applyRemoteItineraryChange(
  itineraries: RemoteItinerary[],
) {
  const pop = Logger.startSubStackTrace("resources::applyRemoteItineraryChange");
  try {
    await db.transaction(
      async (tx) => {
        logger.verbose("Actualizando Itinerarios");
        await upsertItineraries(itineraries, tx);
        await deleteNonRemoteItineraries(
          itineraries.map((it) => it.id!),
          tx,
        );
      },
      { behavior: transBehavior },
    );
  } catch (e) {
    throw transformError(e, "Error al actualizar itinerarios", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}
