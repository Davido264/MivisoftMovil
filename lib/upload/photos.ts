import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { File } from "expo-file-system/next";
import db, { Database } from "@/lib/db";
import { photos_table, PhotoSelect } from "@/lib/db/schema/photos";
import { sql } from "drizzle-orm";
import { Logger } from "@/lib/logger";
import { ApplicationError } from "@/lib/result";

const logger = Logger.getLogger("UPLOAD::PHOTO");

type UploadResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
  localPhotoId: number;
};

// maximum number of parallel uploads ideal for an unestable connection and lowend device
const MAX_PARALLEL_UPLOADS = 3;

export async function uploadPhotos(client: OdooJSONRpc, scope: Database = db) {
  logger.info("Iniciando subida de fotos");
  const photos = await scope
    .select()
    .from(photos_table)
    .where(
      sql`${photos_table.odooId} IS NOT NULL AND ${photos_table.dirty} = 1`,
    );

  const horphans = [] as string[];
  const toUpdate = [] as number[];
  const uristoDelete = new Map<number, File>();
  const length = photos.length;

  for (let i = 0; i < length; i += MAX_PARALLEL_UPLOADS) {
    const promises = [] as Promise<UploadResponse>[];
    const batch = photos.slice(i, i + MAX_PARALLEL_UPLOADS);
    logger.info(`Subiendo lote de ${batch.length} fotos`, {
      photos: batch,
    });

    for (const photo of batch) {
      const photof = new File(photo.uri);
      if (!photof.exists) {
        logger.warn(`${photo.uri} no existe, se eliminará de la base de datos`);
        horphans.push(photo.uri);
        continue;
      }

      if (photof.type == null) {
        logger.warn(`mimetype desconocido desconocido. Omitiendo`, {
          type: photof.type,
          uri: photof.uri,
        });
        horphans.push(photo.uri);
        continue;
      }

      promises.push(uploadPhoto(client, photo, photof));
      uristoDelete.set(photo.id, photof);
    }

    const responses = await Promise.all(promises);
    for (const response of responses) {
      toUpdate.push(response.localPhotoId);
      uristoDelete.get(response.localPhotoId)?.delete();
    }
  }

  await scope
    .update(photos_table)
    .set({ dirty: false })
    .where(sql`${photos_table.id} IN ${toUpdate}`);

  await scope
    .delete(photos_table)
    .where(sql`${photos_table.id} IN ${horphans} OR ${photos_table.dirty} = 0`);
}

async function uploadPhoto(
  client: OdooJSONRpc,
  photo: PhotoSelect,
  photof: File,
) {
  const formData = new FormData();

  const contents = {
    uri: photof.uri,
    type: photof.type,
    name: photo.name,
  };
  logger.info("Leyendo información de la imagen", contents);

  // @ts-ignore
  formData.append(photo.isSign ? "sign" : "file", contents);

  formData.append("model", photo.model);
  formData.append("identifier", photo.odooId!);

  return fetch(`${client.url}/technical_support/upload`, {
    method: "POST",
    headers: {
      Cookie: `session_id=${client.sessionId}`,
    },
    body: formData,
  })
    .then(
      async (r) =>
        ({
          ok: r.ok,
          status: r.status,
          statusText: r.statusText ?? "",
          body: (await r.text()) ?? "",
          localPhotoId: photo.id,
        }) as UploadResponse,
    )
    .then((r) => {
      if (!r.ok) {
        logger.warn(`El servidor retornó ${r.status} ${r.statusText}`, {
          photo,
          response: r,
        });
        throw { type: "HTTPError", message: r.body } as ApplicationError;
      }
      return r;
    });
}
