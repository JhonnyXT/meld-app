# 0005 — Límites de escala y costo en Firestore

**Fecha:** 2026-11-12

## Contexto

Meld no tiene backend propio — todo corre contra Firestore (que escala automáticamente del lado
de Google) y Firebase Auth (Google Sign-In). El riesgo real de "muchos usuarios" no es que el
servidor se caiga (no hay servidor), sino **costo** (lecturas/escrituras facturadas) y **índices
de Firestore faltantes** en producción real (el emulador es más permisivo que producción).

## Reglas ya seguidas (documentadas acá para que no se rompan sin querer)

- **Toda query nueva que combine `where` + `orderBy` en campos DISTINTOS necesita declarar un
  índice compuesto en `firestore.indexes.json` antes de ir a producción real.** Hoy no hace falta
  ninguno: las únicas queries compuestas (`src/sync/remote.ts` → `pullCollection`/
  `pullSpaceCollection`) usan el MISMO campo (`serverUpdatedAt`) en `where` y `orderBy`, que
  Firestore resuelve con un índice de campo único (auto-creado). Si se agrega una query que
  combine, por ejemplo, `where('spaceId', ...)` + `orderBy('updatedAt')`, va a fallar en
  producción real con un error que da el link para crear el índice — no se nota contra el
  emulador local. No existe `firestore.indexes.json` en el repo porque no hace falta todavía.

- **Límite de miembros por espacio** (`maxMembers() = 6` en `firestore.rules`) — protección de
  costo (T10 del roadmap): un espacio no puede crecer sin límite. Hecho cumplir del lado del
  servidor (las reglas lo rechazan), no solo de la UI.

- **Límite de espacios como invitado en plan Free** (`FREE_INVITEE_LIMIT = 2` en
  `src/sync/engine.ts`) — un usuario Free puede estar invitado en como máximo 2 categorías
  compartidas de otra persona. Sin Cloud Functions no hay forma de que el servidor lo haga
  cumplir (documentado así en el propio roadmap) — es solo el chequeo de la app, antes de
  intentar unirse. Si se necesita hacerlo cumplir del lado del servidor, hace falta una Cloud
  Function que cuente espacios por uid (fuera de alcance mientras no haya cobro real).

- **Paginación con cursor, no `listAll`**: `pullCollection`/`pullSpaceCollection` siempre traen
  por `serverUpdatedAt > cursor`, nunca la colección completa — el costo de cada sync es
  proporcional a lo nuevo desde la última vez, no al tamaño total de los datos del usuario.
