import * as Crypto from 'expo-crypto';

/**
 * Id único real (UUID v4) para todo lo que se crea de acá en adelante — sin
 * esto, dos teléfonos offline pueden generar el mismo id (los ids viejos
 * eran `${tipo}-${Date.now()}`, que colisionan si dos dispositivos crean
 * algo en el mismo milisegundo) y la sincronización (ver `SYNC_ROADMAP.md`)
 * no podría distinguirlos. Los ids ya persistidos en dispositivos
 * existentes NO se migran — los referencian completados, notificaciones
 * programadas y widgets.
 */
export function newId(): string {
  return Crypto.randomUUID();
}
