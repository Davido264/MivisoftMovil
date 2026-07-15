// ponytail: el driver expo-sqlite de drizzle es 100% síncrono (executeSync/
// getAllSync/runSync) y corre en el hilo de JS. Un bucle largo (reconciliar
// cientos de registros) lo acapara y React Native no puede procesar toques ni
// renderizar => la UI se congela durante toda la sincronización.
//
// Ni `await` a secas ni `setImmediate` sirven: las microtareas se drenan antes
// de que RN atienda la cola nativa, y RN vacía la cola de immediates dentro del
// mismo frame (callImmediates), así que en un bucle también acapara. SOLO
// `setTimeout(0)` pasa por el módulo de timers nativo y obliga a devolver el
// hilo al run loop nativo, dejando pasar toques y render entre lotes.
//
// Uso: `const breathe = createBreather(); for (...) { await breathe(); ... }`
//
// Cede POR TIEMPO, no por conteo: solo devuelve el hilo si pasaron >= everyMs
// desde el último respiro. Un bucle corto (termina en <everyMs) no cede nunca
// => sin latencia extra; uno largo cede lo justo para mantener la UI viva sin
// alargar de más la sincronización.
export function createBreather(everyMs = 50): () => Promise<void> {
  let last = Date.now();
  return () => {
    if (Date.now() - last < everyMs) return Promise.resolve();
    last = Date.now();
    return new Promise((resolve) =>
      setTimeout(() => {
        last = Date.now();
        resolve();
      }, 0),
    );
  };
}
