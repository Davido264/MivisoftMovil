// ponytail: chunked, no ventana deslizante. Un item lento bloquea su lote,
// pero para el volumen de un sync (decenas de registros) sobra. Si un lote
// necesita concurrencia sostenida, cambiar a un pool con ventana deslizante.
export async function forEachLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += limit) {
    await Promise.all(items.slice(i, i + limit).map(fn));
  }
}

// Concurrencia por defecto para subidas de registros a Odoo.
export const UPLOAD_CONCURRENCY = 5;

// Hermanos del mismo padre van en serie: en Odoo cada create/write de un hijo
// toca write_date del padre, y dos transacciones paralelas sobre la misma fila
// dan "could not serialize access due to concurrent update". Padres distintos
// sí van en paralelo.
export async function forEachByParent<T>(
  items: T[],
  parentOf: (item: T) => unknown,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const groups = new Map<unknown, T[]>();
  for (const item of items) {
    const key = parentOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  await forEachLimit([...groups.values()], UPLOAD_CONCURRENCY, async (g) => {
    for (const item of g) await fn(item);
  });
}
