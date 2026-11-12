# 0002 — `src/sync/engine.ts` no se divide en varios archivos (por ahora)

**Fecha:** 2026-11-12

## Contexto

El plan de la Fase 3 (reorganización de archivos grandes) proponía dividir `engine.ts` (938
líneas) en `sync/engine/personal.ts`, `sync/engine/spaces.ts`, `sync/engine/invites.ts` y
`sync/engine/orchestrator.ts`.

## Problema encontrado al intentarlo

El archivo tiene alta interdependencia real, no solo longitud: `currentUid()` (orquestación) se
usa dentro de `shareCategory`/`joinCategoryWithCode`/`changeMemberRole`/etc. (espacios), y
`requestSync` (orquestación) se llama al final de `shareCategory`/`joinCategoryWithCode` para
disparar un refresh — mientras que la orquestación (`syncOnce`) llama a `pullSpaces`/`pushSpaces`
(espacios). Separarlos en archivos distintos sin introducir una dependencia circular real (A
importa B, B importa A) exige extraer `currentUid`/`requestSync` a un módulo base nuevo y
replantear varios imports — una reescritura real del motor de sync, no una simple reorganización
de archivos.

## Decisión

No dividir `engine.ts` en esta pasada. Es la pieza más crítica de la app (motor de
sincronización) y ya está extensamente probada en dispositivo con dos cuentas reales esta sesión
(push/pull personal, espacios compartidos, offline→online, variant `test` contra la nube real) —
el riesgo de introducir un bug sutil de inicialización por una dependencia circular no compensa el
beneficio de "un archivo más corto". El archivo ya está internamente organizado con separadores de
sección claros (`// ─── Traer y unir`, `// ─── Espacios compartidos`, `// ─── Orquestación`, etc.)
que cumplen buena parte del propósito de la división sin el riesgo.

## Pendiente (fuera de esta pasada)

Si se retoma, el camino correcto es primero extraer un módulo base sin dependencias
(`src/sync/session.ts` ya existe para auth — `currentUid()` podría vivir ahí) y validar con los 37
tests de reglas + verificación en dispositivo con dos cuentas reales después de cada paso, no de
una sola vez.
