import db from "@/lib/db";
import { photos_table, PhotoSelect } from "@/lib/db/schema/photos";
import { Logger } from "@/lib/logger";
import {
  ApplicationError,
  transformError,
  wrapMultiErrors,
} from "@/lib/result";
import { sql } from "drizzle-orm";
import { File } from "expo-file-system/next";
import { fetch } from "expo/fetch";
import { odoo } from "../odoo/env";
import { OdooSession } from "../db/schema/user-session";

const logger = Logger.getLogger("UPLOAD::PHOTO");

export async function uploadPhotos(sessionData: OdooSession) {
  const pop = Logger.startSubStackTrace("upload::uploadPhotos");
  try {
    Logger.pushStackTrace("upload::uploadPhotos+connect");
    console.log(sessionData);
    const { sessionId, usr } = await odoo.connect({
      sessionId: sessionData.sid,
    });
    Logger.popStackTrace();

    logger.verbose("Iniciando subida de fotos");
    Logger.pushStackTrace("upload::uploadPhotos+collect");
    const photos = await db
      .select()
      .from(photos_table)
      .where(sql`${photos_table.odooId} IS NOT NULL`);
    Logger.popStackTrace();

    const MAX_PARALLEL_UPLOADS = 3;
    const batches = batched(photos, MAX_PARALLEL_UPLOADS);
    const errors = [] as ApplicationError[];

    for (const batch of batches) {
      logger.verbose(`Subiendo lote de ${batch.length} fotos`);
      for (const [p, pf] of batch) {
        try {
          await updateHorphanPhotos(p, pf);
          await uploadPhoto(sessionId, p, pf);
          await markUploadedAndDeleteFile(p, pf);
        } catch (e) {
          const ctx = { photo: p, uploaded: pf };
          logger.warn("Error al subir foto", ctx);
          errors.push(transformError(e, "Error al subir foto", ctx));
        }
      }
    }

    await db.delete(photos_table).where(sql`${photos_table.dirty} = ${false}`);

    if (errors.length > 0) {
      logger.error(
        wrapMultiErrors(errors, "No todas las fotos fueron subidas"),
      );
    }
  } catch (e) {
    throw transformError(e, "Error subiendo fotos", {
      stackTrace: Logger.stackTrace,
    });
  } finally {
    pop();
  }
}

async function uploadPhoto(
  sessionId: string,
  photo: PhotoSelect,
  photof: File,
) {
  const formData = new FormData();

  const blob = photof.blob();

  formData.append(photo.isSign ? "sign" : "file", blob, photo.name);

  formData.append("model", photo.model);
  formData.append("name", photo.name);
  formData.append("identifier", photo.odooId!);

  try {
    Logger.pushStackTrace("upload::uploadPhoto");
    return fetch(`${odoo.url}/technical_support/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
        Cookie: `session_id=${sessionId}`,
      },
      body: formData,
    }).then(async (r) => {
      const body = await r.text().catch(() => "");
      if (!r.ok) {
        throw { type: "HTTPError", message: body } as ApplicationError;
      }
    });
  } catch (e) {
    throw transformError(e, "Error al subir foto", {
      photo,
      uploaded: {
        uri: photof.uri,
        type: blob.type,
        name: photof.name,
      },
      stackTrace: Logger.stackTrace,
    });
  }
}

function batched(photos: PhotoSelect[], chunkSize: number) {
  const batches = [] as [PhotoSelect, File][][];
  const length = photos.length;

  for (let i = 0; i < length; i += chunkSize) {
    batches.push(
      photos.slice(i, i + chunkSize).map((p) => [p, new File(p.uri)]),
    );
  }
  return batches;
}

async function updateHorphanPhotos(photo: PhotoSelect, photof: File) {
  let mark = false;

  if (!photof.exists) {
    logger.warn(`Foto no existe`, photo.uri);
    mark = true;
  }

  if (photof.type == null) {
    logger.warn(`mimetype desconocido desconocido`, {
      type: photof.type,
      uri: photof.uri,
    });
    mark = true;
  }

  if (!mark) {
    return [photo, photof];
  }

  logger.warn(`Marcando foto para su elminacion`);

  try {
    Logger.pushStackTrace("upload::markUploadedAndDeleteFile");
    return db
      .update(photos_table)
      .set({ dirty: false })
      .where(sql`${photos_table.id} = ${photo.id}`)
      .then(() => [photo, photof]);
  } catch (e) {
    throw transformError(e, "Error al marcar foto para su eliminación", {
      photo,
      uploaded: photof,
      stackTrace: Logger.stackTrace,
    });
  }
}

async function markUploadedAndDeleteFile(photo: PhotoSelect, photof: File) {
  Logger.pushStackTrace("upload::markUploadedAndDeleteFile");
  try {
    photof.delete();
    await db
      .update(photos_table)
      .set({ dirty: false })
      .where(sql`${photos_table.id} = ${photo.id}`);
  } catch (e) {
    throw transformError(e, "Error al eliminar la foto local", {
      photo,
      stackTrace: Logger.stackTrace,
    });
  }
}
