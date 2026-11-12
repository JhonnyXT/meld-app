# 0004 — Unirse a un espacio con `arrayUnion`, sin leerlo antes

**Fecha:** 2026-11-06

## Contexto

`joinSpace` agrega al usuario a `memberUids`/`editorUids` de un espacio compartido al unirse con
un código de invitación.

## Problema encontrado (bug real)

No se puede leer `spaces/{id}` antes de unirse: `allow get` en `firestore.rules` exige ya ser
miembro. Probado contra las reglas reales con un segundo usuario — un `getDoc` previo revienta con
`PERMISSION_DENIED`. Esto descarta el enfoque obvio de "leer el espacio, agregar mi uid al arreglo
en memoria, mandar el arreglo completo".

## Decisión

`joinCode` viaja en el mismo `update` para que la regla pueda validarlo (`exists(...)`/
`spaceId`/`expiresAt`) sin una Cloud Function; queda guardado en el documento (las reglas no lo
limpian después, ni falta — es solo un rastro de qué código se usó).

El cambio usa `arrayUnion(uid)` en vez de mandar el arreglo completo a mano: las reglas sí ven
`request.resource.data` ya resuelto (con el `arrayUnion` aplicado), así que
`memberUids.size() == resource.data.memberUids.size() + 1` sigue funcionando sin que el cliente
conozca el tamaño anterior. `editorUids` se pasa únicamente cuando el código es de editor — la
regla exige que SOLO esas claves cambien (`changedOnly`), y para un código de lector ni siquiera
se toca ese arreglo.

Código: `src/sync/remote.ts` → `joinSpace`, llamado desde `src/sync/engine.ts` →
`joinCategoryWithCode`.
