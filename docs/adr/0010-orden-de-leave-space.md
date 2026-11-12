# 0010 — `leaveSpace`: borrar `members/{uid}` ANTES del `update` del padre

**Fecha:** histórica (sesión anterior)

## Contexto

Un miembro (no el dueño) sale de un espacio compartido por su cuenta — dos escrituras: borrar su
fila `spaces/{id}/members/{uid}` y sacar su uid de `memberUids` en `spaces/{id}`.

## Decisión

El orden importa: se borra `members/{uid}` ANTES del `update` del padre, mientras
`isMember(id)` (la función de `firestore.rules`) todavía es cierta. Si se hiciera en el orden
inverso, `allow delete` de `members/{uid}` ya no tendría cómo validar que quien borra sigue
siendo miembro de ESE espacio (ya habría salido de `memberUids` antes de llegar a ese borrado).

Código: `src/sync/remote.ts` → `leaveSpace`.
