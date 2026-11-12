# 0011 — El dueño también necesita su fila en `members/{uid}`

**Fecha:** histórica (sesión anterior) — bug real encontrado probando con dos cuentas reales.

## Contexto

Al compartir una categoría (`shareCategory`), solo `joinCategoryWithCode` escribía
`spaces/{id}/members/{uid}` (para quien se UNE). El dueño nunca tenía su propia fila.

## Problema observado

La lista de miembros (`listCategoryMembers`) mostraba el uid crudo del dueño en vez de su nombre,
porque no había ninguna fila `members/{ownerUid}` de donde leer el `name`.

## Decisión

`shareCategory` también escribe su propia fila en `members/{uid}` justo después de crear el
espacio y su config. `ensureMyMemberRow` (llamada al abrir `ShareCategorySheet`) autocura el mismo
caso para espacios creados antes de este fix.

Código: `src/sync/engine.ts` → `shareCategory`, `ensureMyMemberRow`.
