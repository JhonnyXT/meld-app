/**
 * Recurrencia de Task — mismo patrón que `domain/habit.ts` → `isHabitScheduledOn`,
 * pero anclada a la fecha real de la tarea (`date`), no "todos los días desde
 * siempre": una task que repite Semanal/Mensual solo recurre en el mismo
 * día-de-semana/día-de-mes que su `date` original, y nunca antes de esa fecha.
 * `repeatRule` canónico (`domain/quickAdd.ts` → `REPEAT_OPTIONS`): 'Daily' |
 * 'Weekly' | 'Monthly' (el valor `null`/'Never' no llega acá — se filtra antes).
 */
export function isTaskScheduledOn(repeatRule: string, anchorDate: Date, date: Date): boolean {
  if (date.getTime() < anchorDate.getTime()) return false;
  switch (repeatRule) {
    case 'Daily':
      return true;
    case 'Weekly':
      return date.getDay() === anchorDate.getDay();
    case 'Monthly':
      // Si el mes de `date` no tiene el día de `anchorDate` (p. ej. anclada
      // el 31 y el mes no tiene 31), simplemente no recurre ese mes — no se
      // corre al último día disponible, a propósito (mantiene el patrón
      // simple y predecible).
      return date.getDate() === anchorDate.getDate();
    default:
      return false;
  }
}
