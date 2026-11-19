# 0028 — Barra continua real para eventos multi-día en la vista Mes

**Fecha:** 2026-11-19

## Contexto

ADR 0025 dejó anotado como simplificación que un evento multi-día se repetía como el mismo chip en
cada día de su rango, en vez de una barra que cruce visualmente las celdas como en Google Calendar.
El usuario pidió implementar la versión real.

## Decisión

- **`src/domain/monthMultiDayBars.ts` → `buildMultiDayBars(week, itemsByDate)`**: por cada
  `WeekRow`, recorre sus 7 celdas, junta (deduplicando por `id` — el ítem ya viene repetido en cada
  día gracias a ADR 0024) los `Event` con `endDate` no nulo, recorta su rango a los bordes de la
  semana (`startCol`/`endCol` 0-6), y les asigna un "carril" (lane) con el mismo criterio que un
  scheduler de intervalos clásico: cada candidato va al primer carril cuyo último ítem termina antes
  de que este empiece; si ninguno sirve, abre un carril nuevo. Alcanza con esto porque en la
  práctica hay pocos eventos multi-día solapados a la vez — no se buscó un algoritmo de packing
  óptimo.
- **`MonthWeekRow`** dibuja las barras como una capa absoluta (`barsOverlay`) por ENCIMA de la fila
  de 7 `MonthDayCell`, no dentro de cada celda — así una barra de 3 días es un solo rectángulo que
  cruza 3 columnas, no 3 rectángulos separados. La posición horizontal de cada barra es un
  porcentaje (`startCol/7` a `(endCol+1)/7`) del ancho de la fila.
- **Alineación vertical exacta**: para que la capa de barras caiga justo debajo del número de día en
  las 7 celdas (y no un poco más arriba/abajo en algunas), `MonthDayCell` ahora fija la altura de su
  `headerRow` (`CELL_HEADER_HEIGHT = 30`) en vez de dejarla depender del contenido — antes variaba
  sutilmente entre la celda de "hoy" (círculo de 28px) y el resto (texto simple). Las tres constantes
  (`CELL_PADDING_TOP`/`CELL_HEADER_HEIGHT`/`CELL_HEADER_MARGIN_BOTTOM`) se exportan desde
  `MonthDayCell.tsx` como `CELL_TOP_OFFSET`, y `MonthWeekRow` lo usa como `top` de su capa de barras
  — un solo lugar define el offset, evita que se desalineen si cambia el padding de la celda.
  **Si se cambia cualquiera de esas tres constantes, hay que verificar que las barras sigan
  alineadas con el número de día.**
- **`MonthDayCell` reserva espacio** para las barras activas en esa semana
  (`multiDayReservedHeight`, prop que le pasa `MonthWeekRow` = `laneCount * (BAR_HEIGHT + BAR_GAP)`)
  como `marginTop` de su lista de chips — así los chips de un solo día no quedan tapados debajo de
  las barras. Cada celda de la semana recibe el mismo `multiDayReservedHeight` (aunque esa celda en
  particular no tenga ninguna barra), para que todas las filas de chips de esa semana arranquen a la
  misma altura.
- **Un evento multi-día ya NO aparece como chip repetido** en `MonthDayCell` (se filtra
  explícitamente `type === 'event' && endDate`) — ahora es responsabilidad exclusiva de la barra.
  Sigue contando como parte de la lista completa que abre `DayItemsModal` al tocar "+N" (ese modal
  recibe los ítems del día sin filtrar).
- Tocar una barra abre el detalle del ítem, mismo `onPressItem` que ya usan los chips.

## Consecuencias

- Tests nuevos en `src/domain/monthMultiDayBars.test.ts` cubren: recorte a los bordes de la semana,
  asignación de carriles con y sin solapamiento, y que un evento de un solo día no genera barra.
- La vista Semana (grilla horaria, ADR 0026) no se tocó — ese rediseño quedó fuera de esta decisión.

Código: `src/domain/monthMultiDayBars.ts`; `src/components/calendar/MonthWeekRow.tsx`;
`src/components/calendar/MonthDayCell.tsx` → `CELL_TOP_OFFSET`.
