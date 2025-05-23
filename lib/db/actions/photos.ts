import { Paths, File, Directory } from "expo-file-system/next";
import db, { Database } from "@/lib/db";
import { photos_table, PhotoInsert } from "@/lib/db/schema/photos";
import { sql } from "drizzle-orm";
import { Logger } from "@/lib/logger";

const logger = Logger.getLogger("STORAGE::PHOTOS");

export async function storePhotos(scope: Database, p: PhotoInsert[]) {
  const toInsert: PhotoInsert[] = [];
  for (const photo of p) {
    const photof = new File(photo.uri);
    if (!photof.exists) {
      logger.error("Imagen seleccionada no existe. Omitiendo", photo);
      continue;
    }

    logger.info(`Moviendo imagen a ${Paths.document.name}`, photo);
    photof.move(Paths.document);
    photo.uri = photof.uri;
    toInsert.push(photo);
  }

  return scope.insert(photos_table).values(toInsert);
}

export async function deleteOrphanPhotos(scope: Database) {
  for (const file of Paths.document.list()) {
    if (file instanceof Directory) {
      logger.info(`Omitiendo ${file.name}`, file);
      continue;
    }

    if (file.extension == null) {
      logger.info(`Omitiendo archivo sin extensión ${file.name}`, file);
      continue;
    }

    const exists = await scope
      .select()
      .from(photos_table)
      .where(sql`${photos_table.uri} = ${file.uri}`)
      .limit(1)
      .then((result) => result.length > 0);

    if (exists) {
      logger.info(
        "La imagen si existe en la base de datos, omitiendo...",
        file.uri,
      );
      continue;
    }

    logger.info("Eliminando imagen huérfana", file);
    file.delete();
  }
}

export async function setSeverIdForJobRegistryImage(
  jobRegistryId: number,
  odooId: string,
  scope: Database = db,
) {
  logger.info("Actualizando el id del servidor", {
    before: null,
    after: odooId,
  });
  return scope
    .update(photos_table)
    .set({ odooId })
    .where(sql`${photos_table.jobRegistryId} = ${jobRegistryId}`);
}

export async function setServerIdForActivityRegistryImage(
  activityRegistryId: number,
  odooId: string,
  scope: Database = db,
) {
  logger.info("Actualizando el id del servidor", {
    before: null,
    after: odooId,
  });
  return scope
    .update(photos_table)
    .set({ odooId })
    .where(sql`${photos_table.activityRegistryId} = ${activityRegistryId}`);
}

export async function setServerIdForWorktimeRegistryImage(
  worktimeRegistryId: number,
  odooId: string,
  scope: Database = db,
) {
  logger.info("Actualizando el id del servidor", {
    before: null,
    after: odooId,
  });
  return scope
    .update(photos_table)
    .set({ odooId })
    .where(sql`${photos_table.worktimeRegistryId} = ${worktimeRegistryId}`);
}
