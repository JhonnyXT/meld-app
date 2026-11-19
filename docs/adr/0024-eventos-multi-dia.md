# 0024 — Eventos multi-día: `endDate` como rango de solapamiento, no un campo de UI aislado

**Fecha:** 2026-11-18

## Contexto

Parte del rediseño del Calendario estilo Google Calendar (ver plan en curso) necesita que un
`Event` pueda abarcar varios días (ej. un viaje de 3 días) y aparecer en la grilla/scroll de Mes en
cada uno de esos días, no solo en el día de inicio.

## Problema / Decisión

- `Event.endDate: string | null` (mismo formato `YYYY-MM-DD` que `date`). `null` = evento de un
  solo día — TODOS los eventos existentes y todos los demás tipos de `DayItem` quedan exactamente
  igual que antes (retrocompatible, columna nueva nullable sin default).
- La parte no obvia está en `dayItemRepository.listByDate`/`listByDateRange`
  (`src/data/local/dayItemRepository.ts`): un ítem con `endDate` debe aparecer en TODOS los días
  entre `date` y `endDate`, no solo en `date`. En vez de armar el `OR` manualmente (que duplica la
  condición de "sin endDate" en cada caller), se usa `COALESCE(end_date, date)` como "fin efectivo"
  directamente en SQL (`sql` template de drizzle-orm) — un ítem sin `endDate` se comporta como si
  `endDate = date` (rango de un solo día), así que la condición de solapamiento
  (`date <= rango.fin AND finEfectivo >= rango.inicio`) sirve para los dos casos con una sola
  fórmula, sin bifurcar el código por tipo de ítem.
- Esto cambia el resultado de `listByDate`/`listByDateRange` para CUALQUIER caller existente (Today,
  agenda Semana, widgets, búsqueda indirecta) — es intencional y correcto: un evento de 3 días debe
  verse los 3 días en todos lados que ya listan "los ítems de tal día/rango", no solo en Calendar
  Mes. No se tocó ningún otro tipo de `DayItem` (`endDate` no existe fuera de `Event`).
- Sync (`src/sync/`) no necesitó cambios: los ítems viajan como objeto completo (`{ ...data }`), así
  que `endDate` se sincroniza solo una vez que existe en el tipo y el repositorio.

## Consecuencias

- Si en el futuro se agrega un índice sobre `end_date` (no hace falta a esta escala local, ver ADR
  0005 — esa preocupación es sobre Firestore, no SQLite), seguir la regla de ADR 0009: la columna
  tiene que existir (vía `addColumnIfMissing`) ANTES del `CREATE INDEX`.
- La vista Mes del Calendario (en curso) repite el MISMO chip del evento en cada día de su rango en
  vez de dibujar una barra continua superpuesta entre celdas — una simplificación visual
  intencional, no relacionada con esta decisión de datos.

Código: `src/domain/dayItem.ts` → `Event.endDate`; `src/data/local/dayItemRepository.ts` →
`listByDate`/`listByDateRange`.
