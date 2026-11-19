# 0025 — Vista Mes: scroll continuo acotado, chips repetidos en vez de barra superpuesta

**Fecha:** 2026-11-18

## Contexto

Fase B2/B3 del rediseño de Calendario estilo Google Calendar: reemplazar la grilla fija de un mes
(`buildMonthGrid`) por un scroll continuo de semanas, y los puntos de color por chips de texto.

## Decisiones

- **Ventana que crece sola al acercarse a cualquiera de los dos bordes** (actualizado 2026-11-19 —
  la primera versión era una ventana fija de 26+26 semanas, sin crecer; ver razón original más
  abajo). `weeksBack`/`weeksForward` son ahora estado (`INITIAL_WEEKS` = 26 cada uno al abrir,
  `GROW_WEEKS` = 26 más por vez), y `onStartReached`/`onEndReached` de `FlashList` los agrandan sin
  límite superior — nunca se achican. Esto es seguro porque `FlashList` v2 trae
  `maintainVisibleContentPosition` activado por defecto (New Architecture, que Meld ya usa) — no
  hizo falta ninguna lógica manual para no saltar al anteponer semanas arriba, algo que originalmente
  se había descartado por considerarlo frágil. Saltar de mes (`DatePickerModal`) resetea ambas a
  `INITIAL_WEEKS` junto con `windowCenter` — un salto deliberado siempre arranca una ventana fresca
  del tamaño normal, no una acumulada de scrollear mucho antes.
- **El header dinámico ("Nov 2026 · 5 eventos · 49 tareas") sigue el mes dominante visible** vía
  `onViewableItemsChanged` de `FlashList` (`viewabilityConfig.itemVisiblePercentThreshold: 60`),
  actualizando `viewedMonth` — los conteos salen de `monthCounts`, calculado una vez por fetch sobre
  TODOS los ítems ya traídos (no solo los visibles), agrupados por `"YYYY-MM"` desde `dateKey`.
- **Separador de mes dentro del scroll**: una fila liviana (`MonthDividerRow`) se inserta en los
  datos de la lista (`calendarRows`, mezcla de `{kind:'divider'}`/`{kind:'week'}`) cada vez que un
  día cruza a un mes nuevo — simplificación intencional frente al mock de Google (que posiciona la
  etiqueta "Sep" alineada exactamente bajo la columna del día 1): acá es una fila propia de ancho
  completo, no un label flotante en la posición exacta del día. Visualmente cumple la misma función
  (marcar dónde empieza cada mes) sin requerir posicionamiento absoluto dentro de la grilla.
- **`MonthDayCell` cambia de puntos a chips de texto** (hasta `MAX_VISIBLE_CHIPS = 3`, fijo —
  no se mide el alto real de la celda como sugería el plan original, por simplicidad; subir/bajar
  ese número es un solo cambio de constante si hace falta ajustarlo). Color del chip: prioriza
  `item.categoryColor` (si el ítem tiene categoría) y cae a `typeColors[item.type]` si no — más
  parecido al concepto de "color por calendario" de Google que colorear siempre por tipo.
- **Un evento multi-día NO se dibuja como una barra continua superpuesta entre celdas** — como ya
  viene de la Fase B1 (`docs/adr/0024`), el mismo ítem aparece repetido (mismo color/título) en cada
  día de su rango porque así lo devuelve `listByDate`/`listByDateRange` ahora. Una barra absoluta
  real que ignore los bordes de celda exigiría medir anchos de columna y montar un overlay fuera del
  flujo normal — queda como posible mejora visual futura, no bloquea esta fase.
- **El tap de una celda sigue yendo a Today de ese día** (`goToDay`), igual que antes — no se agregó
  tap-to-open-item por chip individual en esta pasada (hubiera cambiado una interacción existente sin
  pedido explícito).

## Bug real encontrado y corregido: la lista no arrancaba en "hoy"

Primera versión: `weekRows` dependía directo de `viewedMonth` (el estado que también actualiza el
header al scrollear). Sin `initialScrollIndex`, `FlashList` arranca mostrando el PRINCIPIO de
`data` — como el array iba desde `WEEKS_BACK` semanas antes de `viewedMonth`, la app abría mostrando
un mes ~6 meses en el pasado en vez de hoy (visto en dispositivo: abría en "Mayo 2026" con la fecha
real en noviembre). Peor aún, como `viewedMonth` se reescribe en cada scroll
(`handleViewableRowsChanged`), reusar esa misma variable como centro de la ventana habría disparado
un recálculo completo de `weekRows`/`calendarRows` en cada scroll — un loop de recentrado constante.

Arreglo: se separaron las dos responsabilidades en dos estados distintos:

- **`windowCenter`**: el centro real de la ventana de `WEEKS_BACK`/`WEEKS_FORWARD` semanas cargadas.
  Solo cambia en un salto DELIBERADO (elegir un mes en `DatePickerModal`) — nunca por el scroll
  normal.
- **`viewedMonth`**: solo controla qué se muestra en el header (título + conteos) y se actualiza
  libremente en cada scroll, sin tocar `weekRows`.

`initialScrollIndex` (calculado buscando en `calendarRows` la fila de semana que contiene la fecha
de `windowCenter`) posiciona el `FlashList` en la semana de hoy al montar. Saltar de mes fuerza un
remount del `FlashList` (`key={windowCenterKey}`) para que `initialScrollIndex` se vuelva a aplicar
sobre la nueva ventana — es la forma más simple de "saltar" sin pelear con la API de scroll
imperativo de una lista virtualizada.

## Consecuencias

- `src/components/calendar/MonthWeekRow.tsx` (nuevo) reemplaza el `View` flex-wrap que antes armaba
  la grilla completa de un mes; cada fila de 7 celdas es ahora un ítem de `FlashList`
  (`src/features/calendar/CalendarScreen.tsx`), igual que `InboxScreen.tsx` ya hacía con sus filas —
  segundo lugar del proyecto que usa `FlashList` (actualizar la mención en `CLAUDE.md` si se vuelve a
  tocar esa sección).
- `buildMonthGrid` (grilla de un solo mes) queda intacta y sin uso actual en Calendar — no se borró
  por si algún otro lugar la necesita en el futuro (ej. un modo "mes clásico" opcional).

Código: `src/domain/calendarGrid.ts` → `buildWeekRows`; `src/features/calendar/CalendarScreen.tsx` →
`calendarRows`/`handleViewableRowsChanged`/`monthCounts`; `src/components/calendar/MonthDayCell.tsx`.
