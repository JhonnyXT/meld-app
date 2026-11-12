# 0007 — `onConflictDoUpdate` por `(habitId, date)`/`(taskId, date)`, no por `id`

**Fecha:** histórica (sesión anterior, probando T8)

## Problema encontrado (bug real)

Al aplicar un completado bajado de la nube (`applyRemoteUpsert`/`applySpaceRemoteUpsert` en
`habitCompletionRepository.ts`/`taskCompletionRepository.ts`), resolver el conflicto por `id`
tiraba abajo el pull entero con "UNIQUE constraint failed": una fila vieja (datos de antes de la
convención de id determinístico, o un re-seed con un esquema de id distinto) podía tener un `id`
distinto para el MISMO par `(habitId, date)`.

## Decisión

El conflicto se resuelve por `(habit_id, date)` / `(task_id, date)` — el índice único real — no
por `id` (que es solo una caché derivada de ese par). Así una fila vieja con otro `id` se
fusiona con la local en vez de romper el insert.

`spaceId: null` explícito en el `set` del conflicto de `applyRemoteUpsert` (el personal, no el de
espacio), no solo en el insert: corrige una fila vieja que haya quedado con el espacio equivocado
— este `apply` es del respaldo PERSONAL, así que si algo la trae por acá es porque es personal de
verdad.

Código: `src/data/local/habitCompletionRepository.ts` y `taskCompletionRepository.ts`.
