import db, { Database } from "@/lib/db";
import { photos_table, PhotoSelect } from "@/lib/db/schema/photos";
import { Logger } from "@/lib/logger";
import {
  ApplicationError,
  transformError,
  wrapMultiErrors,
} from "@/lib/result";
import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
import { sql } from "drizzle-orm";
import { File } from "expo-file-system/next";
import { err, ok, okAsync, ResultAsync } from "neverthrow";
import { fetch } from "expo/fetch";

const logger = Logger.getLogger("UPLOAD::PHOTO");

export function uploadPhotos(client: OdooJSONRpc, scope: Database = db) {
  logger.info("Iniciando subida de fotos");
  return ResultAsync.fromPromise(
    scope
      .select()
      .from(photos_table)
      .where(
        sql`${photos_table.odooId} IS NOT NULL AND ${photos_table.dirty} = 1`,
      ),
    (e) => transformError(e, "Error al obtener fotos para subir"),
  )
    .andThrough((photos) =>
      ResultAsync.fromSafePromise(
        _internalUploadPhotos(photos, client, scope),
      ).andThen((errs) =>
        errs.length === 0
          ? ok()
          : err(wrapMultiErrors(errs, "Error al subir las imágenes")),
      ),
    )
    .andTee(() =>
      ResultAsync.fromPromise(
        scope.delete(photos_table).where(sql`${photos_table.dirty} = ${false}`),
        (e) => {},
      ),
    );
}

async function _internalUploadPhotos(
  photos: PhotoSelect[],
  client: OdooJSONRpc,
  scope: Database,
) {
  // maximum number of parallel uploads ideal for an unestable connection and lowend device
  const MAX_PARALLEL_UPLOADS = 3;
  const batches = batched(photos, MAX_PARALLEL_UPLOADS);
  const errors = [] as ApplicationError[];

  for (const batch of batches) {
    logger.info(`Subiendo lote de ${batch.length} fotos`);
    for (const [p, pf] of batch) {
      const rh = await updateHorphanPhotos(p, pf, scope);

      if (rh.isErr()) {
        errors.push(rh.error);
        continue;
      }

      const ru = await uploadPhoto(client, p, pf).andThen((r) =>
        markUploadedAndDeleteFile(p, pf, scope),
      );

      if (ru.isErr()) {
        errors.push(ru.error);
      }
    }
  }

  return errors;
}

function uploadPhoto(client: OdooJSONRpc, photo: PhotoSelect, photof: File) {
  const formData = new FormData();

  const blob = photof.blob();

  formData.append(photo.isSign ? "sign" : "file", blob, photo.name);

  formData.append("model", photo.model);
  formData.append("identifier", photo.odooId!);
  formData.append("name", photo.name);

  return ResultAsync.fromPromise(
    fetch(`${client.url}/technical_support/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
        Cookie: `session_id=${client.sessionId}`,
      },
      body: formData,
    }).then(async (r) => {
      const body = await r.text().catch(() => "");
      if (!r.ok) {
        throw { type: "HTTPError", message: body } as ApplicationError;
      }
    }),
    (e) =>
      transformError(e, "Error al subir foto", {
        photo,
        uploaded: {
          uri: photof.uri,
          type: blob.type,
          name: photof.name,
        },
      }),
  );
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

function updateHorphanPhotos(
  photo: PhotoSelect,
  photof: File,
  scope: Database,
): ResultAsync<[PhotoSelect, File], ApplicationError> {
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
    return okAsync([photo, photof]);
  }

  logger.warn(`Marcando foto para su elminacion`);
  return ResultAsync.fromPromise(
    scope
      .update(photos_table)
      .set({ dirty: false })
      .where(sql`${photos_table.id} = ${photo.id}`)
      .then(() => [photo, photof]),
    (e) =>
      transformError(e, "Error al marcar foto para su eliminación", {
        photo,
        uploaded: photof,
      }),
  );
}

function markUploadedAndDeleteFile(
  photo: PhotoSelect,
  photof: File,
  scope: Database,
) {
  return ResultAsync.fromThrowable(
    async () => {
      photof.delete();
      await scope
        .update(photos_table)
        .set({ dirty: false })
        .where(sql`${photos_table.id} = ${photo.id}`);
    },
    (e) => transformError(e, "Error al eliminar la foto local", { photo }),
  )();
}

