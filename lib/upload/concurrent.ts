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
