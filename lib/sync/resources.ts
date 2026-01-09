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
import { ok, ResultAsync } from "neverthrow";
import { transformError } from "../result";

const logger = Logger.getLogger("SYNC::RESOURCES");

export function applyRemoteVehicleChange(vehicles: RemoteVehicle[]) {
  const r = db.transaction(
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

  return ResultAsync.fromPromise(r, (e) =>
    transformError(e, "Error al actualizar vecículos"),
  );
}

export function applyRemoteCompanyChange(companies: RemoteCompany[]) {
  const r = db.transaction(
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

  return ResultAsync.fromPromise(r, (e) =>
    transformError(e, "Error al actualizar companías"),
  );
}

export function applyRemoteUsersChange(users: RemoteUser[]) {
  const currentUserId = db.transaction(
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

  return ResultAsync.fromPromise(currentUserId, (e) =>
    transformError(e, "Error al actualizar los usuarios actuales"),
  ).andThen((c) => {
    if (c !== undefined) {
      return ResultAsync.fromPromise(removeUserSession(c), (e) =>
        transformError(e, "Error al eliminar la sesión del usuario"),
      );
    }
    return ok();
  });
}

export function applyRemoteItineraryChange(
  itineraries: RemoteItinerary[],
) {
  const r = db.transaction(
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
  return ResultAsync.fromPromise(r, (e) =>
    transformError(e, "Error al actualizar itinerarios"),
  );
}
