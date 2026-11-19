# 0026 — Vista Semana: grilla horaria estilo Google Calendar

**Fecha:** 2026-11-18

## Contexto

Siguiendo el mismo pedido de diseño unificado estilo Google Calendar (ver ADR 0023/0025), la vista
Semana pasa de ser una agenda vertical por día (`WeekAgendaView`, reusaba `TodayItemRow` apilado por
sección) a una grilla horaria real: columna de horas a la izquierda, 7 columnas de día, los ítems
con hora se dibujan como bloques posicionados por su horario, y los ítems sin hora específica van en
una fila "sin hora" arriba de la grilla — igual que el mock de referencia (fila "No time" con
bloques como "Video...").

## Decisiones

- **Clasificación tiempo/sin-tiempo** (`src/domain/weekGrid.ts` → `timeRangeFor`): un `Event` usa su
  `startTime`/`endTime` real (duración mínima forzada a 20 min para que el bloque no quede
  invisible). Cualquier otro tipo (Task/Habit/Note/VoiceMemo) con `reminderAt` en una hora específica
  (no "Any Time") se dibuja como un bloque de 30 min fijos arrancando en esa hora — Meld no modela
  duración para estos tipos, así que 30 min es solo un tamaño de bloque razonable para que se vea
  como un ítem puntual, no una medida real. Todo lo demás (sin `reminderAt`, o "Any Time") va a la
  fila "sin hora".
- **El bloque posicionado usa el color de categoría si el ítem tiene una** (`item.categoryColor`),
  igual que los chips de la vista Mes (ADR 0025) — mismo criterio de color en toda la vista
  Calendario.
- **La fila "sin hora" se recorta a 2 ítems visibles + "+N"** por columna, igual patrón que el "+N"
  de la vista Mes.
- **`useWeekAgenda` (el hook de datos) no cambió** — sigue trayendo `days`/`itemsByDate` por rango de
  fechas; solo cambió el componente que RENDERIZA esos datos (`WeekHourGrid` en vez de
  `WeekAgendaView`, que se borró por quedar sin ningún uso). Las acciones de ese hook
  (`toggleComplete`/`remove`/`clearVoiceMemoAudio`, pensadas para los gestos de swipe de la agenda
  vertical) quedan sin consumidor en la UI por ahora — no se tocó el hook en sí, para no arriesgar su
  lógica de `completedByMap` (ADR 0017) que otra pantalla podría volver a necesitar.
- **Tocar un bloque abre el detalle del ítem** (`useItemDetailStore.getState().open(id)`), tocar un
  día en el selector de arriba (`WeekDaySelector`) navega a Today de ese día (`goToDay`) — ya no
  hace scroll a una sección (no existen "secciones por día" en una grilla, todas las columnas son
  siempre visibles a la vez; solo se scrollea verticalmente por hora).
- **Sin indicador de "hora actual"** (la línea roja horizontal que tiene Google Calendar) en esta
  pasada — posible mejora futura, no bloquea esta fase.

## Consecuencias

- El subtítulo del header en Semana muestra el rango de fechas ("18 nov – 24 nov, 2026"), igual
  patrón que el subtítulo de conteos de la vista Mes (mismo lugar del `ScreenHeader`).
- `src/features/calendar/WeekAgendaView.tsx` se eliminó (sin otro uso en el árbol, confirmado por
  grep) — si en el futuro hace falta una vista de agenda vertical de nuevo, recuperarla del historial
  de git en vez de rehacerla de cero.

Código: `src/domain/weekGrid.ts`; `src/components/calendar/WeekHourGrid.tsx`;
`src/features/calendar/CalendarScreen.tsx` → bloque `view === 'week'`.
