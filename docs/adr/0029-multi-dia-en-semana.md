# 0029 — Eventos multi-día en la vista Semana: misma barra que en Mes

**Fecha:** 2026-11-19

## Contexto

ADR 0028 agregó la barra continua para eventos multi-día en la vista Mes, pero la vista Semana
(grilla horaria, ADR 0026) seguía clasificando CUALQUIER evento solo por su `startTime`/`endTime`
real — un evento de 3 días aparecía como un bloque puntual pegado a un único día (el que tuviera
en `itemsByDate`, determinado por cómo agrupa `useWeekAgenda`), sin reflejar que duraba varios días.
El usuario lo notó probando un evento de prueba y preguntó por qué Semana no tenía el mismo
comportamiento que Mes.

## Decisión

- **`buildMultiDayBars` (ADR 0028) se generalizó** para aceptar cualquier fila de 7
  `{ dateKey: string }`, no solo un `WeekRow` de `calendarGrid.ts` — la interfaz pasó a llamarse
  `SevenDayRow`. Esto permite reusarla tal cual desde `WeekHourGrid`, construyendo una fila liviana
  a partir de su propio `days: Date[]` (`{ cells: dateKeys.map(dateKey => ({ dateKey })) }`).
- **`WeekHourGrid`** ahora excluye los eventos multi-día (`type === 'event' && endDate`) de la
  clasificación tiempo/sin-tiempo de cada día (`isMultiDay`, filtrado antes de
  `splitTimedAndUntimed`) y los dibuja en una fila propia arriba de la grilla (`multiDayRow`), con
  el mismo empaquetado por carriles que Mes — una sola barra que cruza las columnas de los días que
  abarca, en vez de un bloque puntual en un solo día.
- Mismo criterio de color (categoría si tiene, si no `typeColors.event`) y mismo comportamiento de
  tap (abre el detalle) que la barra de Mes y que los bloques/chips del resto de la grilla.

## Consecuencias

- `buildMultiDayBars` no necesitó cambios de lógica, solo de tipo — la función ya calculaba el
  rango a partir de `item.date`/`item.endDate` directamente, no de cuántas veces aparecía el ítem
  repetido en `itemsByDate` (alcanza con que aparezca una vez, en cualquier día de su rango).
- Si en el futuro se agrega la fila "sin hora" y la fila "multi-día" en un solo bloque visual (hoy
  son dos filas separadas, una arriba de la otra), revisar que `TIME_COL_WIDTH` siga alineando
  ambas con la grilla de abajo.

Código: `src/domain/monthMultiDayBars.ts` → `SevenDayRow`; `src/components/calendar/WeekHourGrid.tsx`.
