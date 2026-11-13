# 0011 — El modelo de la demo es una versión reducida de la app, solo en memoria

**Fecha:** histórica (previa a esta limpieza).

## Contexto

`landing/src/demo/model.ts` es una versión reducida de `DayItem` (`src/domain/dayItem.ts` de la
app real) para la demo interactiva de la pantalla "Hoy" en la portada.
`landing/src/demo/healthMetrics.ts` es lo mismo para `HEALTH_METRIC_OPTIONS`, con la diferencia de
que el ícono es directamente el componente de `lucide-react` en vez de un `IconName` semántico (la
demo no tiene la capa de mapeo `Icon.tsx` de la app).

## Decisiones

- **Solo en memoria, a propósito**: `useDemo.ts` guarda el estado con `useReducer` sin persistir a
  ningún lado — al recargar la página vuelve a los ítems de ejemplo (`seedItems`). No es un bug
  pendiente de arreglar.
- **Los valores internos de los presets quedan siempre en inglés** (`QUICK_ADD_CATEGORIES`,
  `HABIT_SCHEDULES`, `REPEAT_OPTIONS`, `EARLY_ALERT_OPTIONS`, etc.), igual que en la app real —
  solo la etiqueta visible se traduce, vía `presetLabel(value, lang)`. El parser de voz
  (`voiceParser.ts`, ver ADR 0002) y los `PresetAccordion` dependen de que el valor interno sea
  exactamente ese string en inglés; traducir el array rompería ambos.
- Varias funciones replican una regla de negocio puntual de la app (`isHabitScheduledOn`,
  `GROUP_ORDER`, hábitos de salud al final en `visibleFor`) — si esa regla cambia en la app real,
  revisar si corresponde actualizarla acá también (no hay nada que lo sincronice automáticamente).

Código: `landing/src/demo/model.ts`, `landing/src/demo/healthMetrics.ts`, `landing/src/demo/useDemo.ts`.
