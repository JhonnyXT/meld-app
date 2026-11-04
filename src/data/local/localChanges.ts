/**
 * Aviso de "algo cambió en SQLite" para `src/sync/` (Regla #3: los repositorios no importan
 * Firebase, así que no pueden disparar la sync directo — exponen este pub-sub en su lugar, y la
 * sync se suscribe). Sin datos en el evento: quien escucha vuelve a leer lo que necesite.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function emitLocalChange(): void {
  for (const listener of listeners) listener();
}

/** Devuelve la función para des-suscribirse. */
export function onLocalChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
