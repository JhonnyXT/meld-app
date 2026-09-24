/** Prueba de Pro SIMULADA (sin tienda ni cobro): solo cuenta días desde que el
 * usuario la empezó. Cuando exista RevenueCat, la fuente de verdad pasa a ser
 * la suscripción de la tienda y esto se reemplaza. */
export const TRIAL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function trialDaysLeft(startedAt: string, now: Date = new Date()): number {
  const elapsedDays = Math.floor((now.getTime() - new Date(startedAt).getTime()) / DAY_MS);
  return Math.max(0, TRIAL_DAYS - elapsedDays);
}

/** Fecha de inicio que deja la prueba vencida ya — para probar el aviso de fin
 * de prueba sin esperar 14 días reales (solo dev/test). */
export function expiredTrialStart(now: Date = new Date()): string {
  return new Date(now.getTime() - (TRIAL_DAYS + 1) * DAY_MS).toISOString();
}
