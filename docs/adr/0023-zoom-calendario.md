# 0023 — Zoom por pellizco en Calendario: alcance en dos fases

**Fecha:** 2026-11-18

## Contexto

El usuario pidió llevar el Calendario a un diseño unificado estilo Google Calendar: scroll
continuo de semanas con barras de eventos que pueden abarcar varios días, y un gesto de pellizco
(pinch) que cambia la granularidad (Día ↔ Semana ↔ Mes) según cuánto se haga zoom.

Hoy Calendar tiene 3 vistas discretas (Mes grilla, Semana agenda, Año heatmap de hábitos),
cambiadas con un toggle o un swipe horizontal (`CALENDAR_VIEW_ORDER`). El modelo de datos no
soporta eventos multi-día (`Event` solo tiene `startTime`/`endTime` del mismo día — ver
"Simplificaciones conocidas" en `CLAUDE.md`).

## Problema / Decisión

Replicar el diseño completo de Google Calendar (scroll continuo + barras multi-día) exige primero
extender el modelo de datos y rehacer la pantalla desde cero — es trabajo de varias fases. Se
decidió con el usuario dividir el pedido en dos:

- **Fase A (esta, implementada)**: agregar el GESTO de zoom por pellizco sobre el diseño actual.
  `CALENDAR_ZOOM_ORDER` (`src/features/calendar/calendarView.ts`) define el orden de menos a más
  detalle: `year → month → week`. Un `Gesture.Pinch()` (`CalendarScreen.tsx`,
  `pinchZoomGesture`) se compone con el swipe horizontal existente vía `Gesture.Simultaneous` (no
  compiten: pellizco necesita 2 dedos, swipe 1). Al cruzar un umbral de escala
  (`PINCH_IN_THRESHOLD`/`PINCH_OUT_THRESHOLD`) cambia de vista con un haptic de selección, igual
  que los demás gestos de la app. Durante el pellizco hay un guiño visual sutil (escala 1 ± 6% del
  delta real) para que se sienta como un zoom real, sin rehacer el layout.
  - **No incluye "Día"**: la pantalla Today ya cumple ese rol (se llega tocando un día), pero
    zoomear hacia adentro desde Semana necesitaría saber qué día específico está bajo los dedos —
    eso requiere el scroll continuo de la Fase B para tener sentido real (en la agenda semanal
    actual no hay un "día enfocado" único). Se deja fuera de la Fase A a propósito.
- **Fase B (planeada, no implementada)**: el rediseño visual completo — scroll continuo vertical de
  semanas (reemplaza la grilla fija por mes), eventos con barra horizontal multi-día, y el pellizco
  transicionando continuamente entre Día/Semana/Mes con el día bajo los dedos como foco. Requiere
  antes: extender `Event`/`DayItem` para multi-día (campo de fecha de fin, migración de SQLite,
  ajustar `dayItemRepository`, `MonthDayCell`, `WeekAgendaView`, el heatmap de Año no cambia).

## Consecuencias

- `CALENDAR_ZOOM_ORDER` es un orden DISTINTO de `CALENDAR_VIEW_ORDER` (usado por el swipe) a
  propósito: el swipe mantiene su orden histórico (mes→semana→año), mientras que el zoom va de lo
  más abarcador a lo más detallado (año→mes→semana) — son dos ejes de navegación distintos sobre
  las mismas 3 vistas.
- La Fase B es trabajo pendiente real, no simulado — si se retoma, empezar por el modelo de datos
  (multi-día) antes de tocar la UI, siguiendo el mismo patrón de "tabla ancha" + `ALTER TABLE` ya
  documentado en `CLAUDE.md` para agregar un campo nuevo a un subtipo de `DayItem`.

Código: `src/features/calendar/calendarView.ts` → `CALENDAR_ZOOM_ORDER`;
`src/features/calendar/CalendarScreen.tsx` → `pinchZoomGesture`/`stepZoom`.
