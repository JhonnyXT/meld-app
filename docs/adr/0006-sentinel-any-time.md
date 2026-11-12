# 0006 — "24:00" y "-1" como sentinel de "Any Time", no "00:00"/"0"

**Fecha:** histórica (sesión anterior)

## Problema encontrado (bug real)

Un recordatorio "sin hora específica" (Any Time) necesita un valor sentinel. Usar `"00:00"` como
ese sentinel hacía que un recordatorio puesto a las 12:00 AM se interpretara como "Any Time" y
JAMÁS disparara su notificación real — una medianoche real era indistinguible del sentinel.

## Decisión

- `ANY_TIME_HHMM = '24:00'` para el campo persistido (`reminderAt`): el wheel-picker de hora nunca
  puede producir `24:00` (solo cubre `00:00`-`23:59`), así que no colisiona con una medianoche real
  elegida por el usuario.
- `ANY_TIME_MINUTES = -1` para el valor en memoria (`TimeFieldRow`/`WheelTimePicker`, antes de
  convertirse a `reminderAt`): fuera del rango real `0`-`1439`, tercera opción elegible junto a
  `null` (apagado, sin recordatorio) y un número real de minutos.

Código: `src/domain/time.ts`. No reemplazar por `'00:00'`/`0` sin volver a introducir el bug.
