# 0017 — `useWeekAgenda` necesita su propio `completedByMap`, no puede reusar el de Today

**Fecha:** histórica (sesión anterior) — bug real encontrado probando con dos cuentas reales,
2026-11-11.

## Problema

El badge "completado por X" (Fase 4, categorías compartidas) no aparecía en la agenda Semana
aunque el dato ya estaba sincronizado.

## Causa

`dayItemsStore.completedByMap` solo se recarga para `selectedDateKey` (un solo día). La agenda
Semana (`useWeekAgenda`) muestra ítems de varios días a la vez, así que ese mapa de Today nunca
cubre los demás días de la semana.

## Decisión

`useWeekAgenda` mantiene su propio `completedByMap`, recalculado en `reload()` a partir de
`dayItemRepository.getCompletedByUidMap(items.map(i => i.id))` sobre TODOS los ítems de la semana
visible. Solo cubre tasks/eventos sin repetir (columna directa en `day_items`) — hábitos/tasks que
repiten no recurren en la agenda Semana (ver CLAUDE.md → "Simplificaciones conocidas"), así que no
hace falta un mapa aparte para esos.

Código: `src/features/calendar/useWeekAgenda.ts` → `reload`.
