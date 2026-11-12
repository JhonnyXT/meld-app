# 0008 — Modelo de datos: categorías compartidas y bookkeeping de sync

**Fecha:** histórica (consolidado de varios comentarios largos del código)

## `day_items` / `habit_completions` / `task_completions` — `space_id`

`spaceId` (NULL por defecto) decide a qué colección sube cada fila: NULL = respaldo personal
(`users/{uid}/...`, el caso de siempre); si no, el id del espacio en `spaces/{spaceId}/...` en vez
de ahí. Denormalizado (copiado de `categories.spaceId` al crear el ítem) para que el motor de sync
nunca necesite un JOIN contra `categories` en su ruta caliente — y es seguro: mover un ítem a otra
categoría (D5 de my-wallet-app) le da SIEMPRE un id nuevo + tombstone del viejo, nunca reasigna
`spaceId` en el mismo id, así que este valor es inmutable durante toda la vida de una fila.

## `categories` — `space_id` / `space_role` / `space_owner_uid`

`spaceId` NULL = categoría personal (el caso de siempre); si no, el id del espacio en
`spaces/{spaceId}` — SIEMPRE igual al `id` de esta misma fila ("quien se une crea la categoría
local con ese mismo id", ver "Modelo en Firestore" de `SYNC_ROADMAP.md`). Columna aparte igual,
por simetría con `space_id` en `day_items`/`habit_completions`/`task_completions` (mismo nombre de
columna en todas, mismo criterio de query) y para no tener que tratar las categorías distinto si
ese invariante cambia algún día.

`spaceRole` es MI rol en este espacio (`'editor'`/`'viewer'`), cacheado acá para no leer
`spaces/{id}` en cada chequeo de permiso de la UI (Quick Add/detalle/swipe/widgets con un lector).

`spaceOwnerUid` es quién es el dueño (compararlo con el uid de la sesión decide "puedo cambiar
roles/eliminar el espacio entero").

## `completed_by_uid` (Fase 4 — "quién completó esto")

Quién marcó `status: 'done'` (en `day_items`, solo para una task SIN `repeatRule`) o quién marcó
hecho ese día (en `habit_completions`/`task_completions`). NULL mientras no está hecha, o en
cualquier ítem/completado personal (sin `spaceId`, nunca se estampa ahí).

Se fija al SUBIR, no al guardar localmente (ver `src/sync/engine.ts` → `pushSpaces`,
`resolveCompletedByUidForPush`): el repositorio no tiene forma de saber el uid de la sesión sin
importar Firebase, lo que violaría la Regla #3 (la red solo vive en `src/sync/`).

Se limpia a `null`:
- En `day_items`: cuando una task sin `repeatRule` deja de estar `'done'` (nadie la completó).
- En `habit_completions`/`task_completions`: al re-completar (reusa la misma fila, limpiando
  `deletedAt`) — para que quede atribuido a quien re-completó, no a quien la había completado la
  vez anterior.

## `space_members` — caché local de nombres

Solo `uid → name`, para resolver el badge "completado por X" (`DayItemRow` → `TrailingBadge` de
tipo `completedBy`) sin pegarle a la red en cada fila de Today. Se llena en `pullSpaces()`
(`src/sync/engine.ts`), reusando `listCategoryMembers(spaceId)`. `id = ${spaceId}:${uid}`
(compuesto, sin necesidad de clave primaria de dos columnas en Drizzle/SQLite). Nunca se borra
explícitamente — un nombre "stale" de un espacio ya abandonado es inofensivo, no se vuelve a leer
una vez que `categories.spaceId` para ese id es `null`.

Código: `src/data/local/schema.ts`.
