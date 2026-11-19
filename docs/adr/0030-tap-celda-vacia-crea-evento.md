# 0030 — Tocar una celda vacía de la grilla horaria crea un evento ahí mismo

**Fecha:** 2026-11-19

## Contexto

Pedido explícito: que tocar una celda vacía de la grilla horaria de Semana (como en Google
Calendar) abra la creación rápida de un ítem, ya con el día y la hora correctos, para no tener que
abrir Quick Add y configurar todo a mano.

## Decisión

- Cada celda de hora (`HOURS.map` dentro de cada columna de día en `WeekHourGrid`) pasó de ser un
  `View` decorativo a un `Pressable` que llama a `onCreateAt(dateKey, h * 60)` — sin precisión de
  media hora, se ancla a la hora en punto de la fila tocada (el usuario puede ajustar la hora exacta
  después en Quick Add, como ya hace con cualquier otro campo).
- `CalendarScreen` resuelve `onCreateAt` abriendo Quick Add PRE-LLENADO vía
  `useQuickAddStore.getState().openWithPrefill(...)`, el mismo mecanismo que ya usa "Agregar por
  voz" (`VoicePrefill`) — se reusa esa ruta en vez de crear un mecanismo nuevo. Tipo fijo `'event'`
  (tocar un hueco de horario sugiere un evento con hora, no una tarea u hábito) con `title: ''` y el
  resto de campos del prefill en `null`/vacío.
- **Los bloques con ítem y la barra multi-día siguen interceptando el toque antes que la celda**:
  como se dibujan DESPUÉS de las celdas de hora en el árbol (mismos padres), React Native les da
  prioridad de touch en esa zona — tocar un ítem existente sigue abriendo su detalle, nunca dispara
  además la creación de uno nuevo debajo.

## Consecuencias

- Si en el futuro se quiere feedback de qué celda se tocó (un hover/resaltado momentáneo antes de
  abrir Quick Add, como hace Google), agregarlo como un estado local de `WeekHourGrid` — no hacía
  falta para este pedido.
- La vista Mes no tiene un equivalente (tocar un día vacío sigue yendo a Today, no abre Quick Add) —
  no se pidió y cambiaría una navegación ya establecida (ADR 0027).

Código: `src/components/calendar/WeekHourGrid.tsx` → `onCreateAt`;
`src/features/calendar/CalendarScreen.tsx`.
