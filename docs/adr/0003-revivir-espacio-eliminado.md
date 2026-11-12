# 0003 — Revivir un espacio compartido eliminado, no recrearlo

**Fecha:** 2026-11-11

## Contexto

Compartir una categoría que ya tuvo un espacio compartido antes (se compartió, se eliminó, y se
comparte de nuevo — el `spaceId` es siempre el mismo id que la categoría, nunca cambia).

## Problema encontrado (bug real)

`createSpaceDoc` (un `setDoc` completo) fallaba con "No se pudo compartir la categoría" al
intentar compartir de nuevo. El documento `spaces/{id}` sigue existiendo en Firestore — solo
marcado `deletedAt`, nunca se borra de verdad — así que un `setDoc` ahí es un `update` para las
reglas de seguridad, no un `create`, y ninguna rama de `allow update` admite reescribir TODO el
documento de una.

## Decisión

`reviveSpaceDoc(spaceId, uid)` en dos pasos, porque las reglas no dejan tocar `memberUids` y
`editorUids` en el mismo `update` (son ramas distintas de `allow update`, cada una con su propio
`changedOnly`):

1. `memberUids: [uid]` + `deletedAt: null` (rama del dueño: quitar gente + reactivar).
2. `editorUids: [uid]` (rama de cambiar rol).

Reinicia limpio con solo el dueño adentro, en vez de arrastrar a quien ya estaba antes de
eliminarlo — esa gente ya se desvinculó localmente al ver `deletedAt`, y sorprendería verse
re-agregado sin haber hecho nada.

Código: `src/sync/remote.ts` → `reviveSpaceDoc`, llamado desde `src/sync/engine.ts` →
`shareCategory` cuando ya existe un espacio propio con ese id.
