# 0019 — `enteringToday` fuerza el esqueleto aunque la lista no esté vacía

**Fecha:** histórica (sesión anterior) — bug real reportado en dispositivo ("se tarda un poco...
no se ve el esqueleto").

## Problema

El Stack de Expo Router no desmonta Today al navegar a otra pantalla. Al volver, la lista vieja
seguía en `items`, así que la condición `loading && visibleRows.length === 0` (la que muestra
`ListSkeleton` en el arranque) nunca se cumplía, y la recarga/sync al reenfocar pasaba en silencio
detrás del contenido viejo.

## Decisión

Un estado `enteringToday` aparte, fijado en `true` al enfocar la pantalla (`useFocusEffect`) y en
`false` apenas termina el `reload()` local, fuerza el mismo esqueleto del arranque también en este
caso, sin depender de que la lista esté vacía.

Código: `src/features/today/TodayScreen.tsx`.
