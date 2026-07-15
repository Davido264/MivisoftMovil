import { Paths, File, Directory } from "expo-file-system/next";
import db, { Database } from "@/lib/db";
import { photos_table, PhotoInsert } from "@/lib/db/schema/photos";
import { sql } from "drizzle-orm";
import { Logger } from "@/lib/logger";

const logger = Logger.getLogger("STORAGE::PHOTOS");

export function imageExists(uri: string | null | undefined): boolean {
  if (!uri || uri.trim().length === 0) {
    return false;
  }
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export async function storePhotos(p: PhotoInsert[], scope: Database) {
  const toInsert: PhotoInsert[] = [];
  for (const photo of p) {
    const photof = new File(photo.uri);
    if (!photof.exists) {
      logger.warn("Imagen seleccionada no existe. Omitiendo", photo);
      continue;
    }

    photof.move(Paths.document);
    photo.uri = photof.uri;
    toInsert.push(photo);
  }

  // ponytail: Drizzle lanza "values() must be called with at least one value"
  // si toInsert quedó vacío (p.ej. todas las imágenes eran rutas temporales ya
  // borradas del cache). Guard en la función compartida, no en cada llamador.
  if (toInsert.length === 0) {
    logger.warn("No hay imágenes válidas para guardar, se omite el insert");
    return;
  }

  return scope.insert(photos_table).values(toInsert);
}

export async function deleteOrphanPhotos(scope: Database) {
  for (const file of Paths.document.list()) {
    if (file instanceof Directory) {
      logger.verbose(`Omitiendo ${file.name}`, file);
      continue;
    }

    if (file.extension == null) {
      logger.verbose(`Omitiendo archivo sin extensión ${file.name}`, file);
      continue;
    }

    const exists = await scope
      .select()
      .from(photos_table)
      .where(sql`${photos_table.uri} = ${file.uri}`)
      .limit(1)
      .then((result) => result.length > 0);

    if (exists) {
      logger.verbose(
        "La imagen si existe en la base de datos, omitiendo...",
        file.uri,
      );
      continue;
    }

    logger.verbose("Eliminando imagen huérfana", file);
    file.delete();
  }
}

// ponytail: el odooId de la foto solo se escribía al CREAR el registro padre
// (setSeverIdForJobRegistryImage y hermanas, en el flujo de creación). Las fotos
// que se agregan a un padre ya sincronizado (firma/evidencia tras finalizar el
// trabajo) nacen con odooId NULL y nunca lo reciben, así que uploadPhotos —que
// filtra por odooId IS NOT NULL— jamás las sube y quedan pendientes para siempre.
// Aquí resolvemos el odooId del padre por su FK local, justo antes de subir.
export async function backfillPhotoOdooIds(scope: Database = db) {
  const parents: [string, string][] = [
    ["jobRegistryId", "ts_jobreg"],
    ["activityRegistryId", "ts_actreg"],
    ["worktimeRegistryId", "ts_worktime"],
  ];
  for (const [fk, table] of parents) {
    await scope.run(sql`
      UPDATE ts_photos
      SET odooId = CAST((SELECT odooId FROM ${sql.raw(table)} p WHERE p.id = ts_photos.${sql.raw(fk)}) AS TEXT)
      WHERE ts_photos.odooId IS NULL
        AND ts_photos.${sql.raw(fk)} IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM ${sql.raw(table)} p
          WHERE p.id = ts_photos.${sql.raw(fk)} AND p.odooId IS NOT NULL
        )
    `);
  }
}

export async function setSeverIdForJobRegistryImage(
  jobRegistryId: number,
  odooId: string,
  scope: Database = db,
) {
  logger.verbose("Actualizando el id del servidor", {
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
  logger.verbose("Actualizando el id del servidor", {
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
  logger.verbose("Actualizando el id del servidor", {
    before: null,
    after: odooId,
  });
  return scope
    .update(photos_table)
    .set({ odooId })
    .where(sql`${photos_table.worktimeRegistryId} = ${worktimeRegistryId}`);
}
