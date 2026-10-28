# SYNC_ROADMAP.md — Cuentas, respaldo y categorías compartidas (Pro)

Plan por fases para el plan **Pro** de Meld: cuenta con Google, respaldo y sync en la nube, y
**categorías compartidas** (listas que varias personas ven y editan). Iniciado 2026-10-28 en la
rama `feature/pro-sync`; `main` sigue 100% local y es lo que va a los testers de Play Console.
Adaptado del diseño ya probado en `my-wallet-app` (`SYNC_ROADMAP.md` de ese repo). Decisiones de
producto en `docs/decisions.md` (2026-10-27).

**Estado:** Fase 0 (este documento). Nada implementado todavía.

---

## Objetivo

- **Sin cuenta o sin internet: Meld funciona exactamente como hoy.** El plan Free es local y no
  vence.
- **Pro con sesión iniciada:**
  - **Respaldo:** todo se sube a la nube; al cambiar de celular, iniciar sesión recupera todo.
  - **Categorías compartidas:** una categoría (ej. "Casa") con todos sus ítems, compartida con
    otras personas que la ven y la editan desde su teléfono.

## Principios

1. **SQLite sigue siendo la fuente de verdad.** La UI lee y escribe SIEMPRE local; la nube es una
   copia.
2. **Nada espera a la red.** La sync corre en segundo plano y reintenta; si falla, la app sigue.
3. **La red solo vive en `src/sync/`.** Pantallas, stores y repositorios no importan Firebase (un
   test lo hace cumplir, como `sync.boundary.test.ts` de My Wallet).
4. **Iniciar sesión es opcional** y solo hace falta para lo Pro.
5. **El plan Free no cambia** con esta rama: nada que hoy es gratis pasa a pedir cuenta o Pro.

## Decisiones tomadas

| # | Decisión | Por qué |
|---|---|---|
| T1 | **Firebase** (Firestore + Auth) | Reusar el diseño y el código de My Wallet; el plan gratis no se pausa; la cola offline del SDK sobrevive al cierre de la app. Supabase (pausa a los 7 días, sin cola offline) y un VPS propio (Contabo) descartados. |
| T2 | **SQLite local se queda**, Firebase es capa de sync | Today, Calendario, hábitos, widgets y el headless del widget siguen leyendo SQLite sin cambios. |
| T3 | **Login solo con Google** (Android). Apple al publicar en iOS | Guía 4.8 de la App Store: con login de terceros hay que ofrecer Sign in with Apple. |
| T4 | **Conflictos: gana la última edición** (`updatedAt`; en empate, el borrado) | Mismo `pickWinner` de My Wallet. Dos personas editando el mismo ítem al mismo segundo es rarísimo. |
| T5 | **Borrados como tombstone** (`deletedAt`), no borrado físico | Si no, el otro teléfono nunca se entera. Al subir, un borrado lleva solo `{ updatedAt, deletedAt }`, sin contenido. |
| T6 | **Un entorno por variant** | `dev` → Firebase Emulator local; `test` → proyecto `meld-test`; `prod` → proyecto `meld-prod`. La data de testers nunca se mezcla con la de usuarios. |
| T7 | **Primer login con datos en el teléfono y en la nube: se unen** | Nada se pierde (ids estables, Fase 1). |
| T8 | **Al cerrar sesión se pregunta** "Mantener / Borrar de este teléfono" | Borrar se bloquea si hay cambios sin subir. |
| T9 | **Compartir: solo el dueño necesita Pro**; invitados Free participan | Cada invitación trae usuarios nuevos; paga quien organiza. |
| T10 | **Límites**: máx. ~6 miembros por categoría compartida; un usuario Free puede estar en 1-2 categorías compartidas como invitado | Controla costo y deja un motivo claro para pasar a Pro. Número exacto a cerrar en la Fase 4. |
| T11 | **Roles editor / lector**, elegidos por el dueño por persona | Las reglas de Firestore lo validan (`editorUids`). Sin asignar tareas a una persona en v1. |
| T12 | **Primero solo tareas, eventos, hábitos y notas en la nube**; notas de voz y fotos de Momentos después | Los archivos necesitan Cloud Storage, que exige el plan Blaze desde feb-2026. Se suman cuando haya ingresos de Pro (Fase 6). |
| T13 | **Recordatorios: de cada persona** | Las notificaciones locales se programan en cada teléfono; en una categoría compartida, poner hora no hace sonar el teléfono de los demás. |

## Inventario: qué vive en el teléfono y qué se sincroniza

| Dato | Dónde vive hoy | ¿Se sincroniza? | Notas |
|---|---|---|---|
| Ítems (`day_items`: tareas, eventos, hábitos, notas) | SQLite | ✅ | La pieza principal. Los de una categoría compartida van al espacio, no al respaldo personal. |
| Notas de voz (`audioFileUri`, `durationSeconds`) | SQLite + archivo local | ⚠️ solo metadatos | El audio se sube en la Fase 6 (Blaze). Hasta entonces, en otro teléfono se ve "Audio eliminado". |
| Momentos (`mediaUri`) | SQLite + URI del Photo Picker | ⚠️ solo metadatos | Ídem, Fase 6. Hoy la URI ni siquiera se copia a almacenamiento propio (ver CLAUDE.md). |
| Completados de hábitos (`habit_completions`) | SQLite | ✅ | Id determinístico `${habitId}-${date}`: dos teléfonos marcando el mismo día no duplican. Desmarcar pasa a tombstone. |
| Completados de tareas que repiten (`task_completions`) | SQLite | ✅ | Igual que los de hábitos. |
| Categorías (`categories`) | SQLite | ✅ | Ver "categoría por id" en la Fase 1. |
| Ajustes visuales (tema, acento, idioma, espaciado, estilo de completados) | AsyncStorage `meld-settings` | ✅ | Preferencias de la cuenta. |
| `habitsInTodayEnabled`, `coolHabitsEnabled` | AsyncStorage | ✅ | |
| `onboardingCompleted` | AsyncStorage | ✅ | Al restaurar en un teléfono nuevo se salta el onboarding. |
| `notificationsEnabled` | AsyncStorage | ❌ | Depende del permiso de cada teléfono. |
| `plan`, `trialStartedAt` | AsyncStorage | ❌ | La fuente de verdad pasa a ser la suscripción (RevenueCat, Fase 5). |
| Notificaciones programadas | SO (expo-notifications) | ❌ | Se reprograman en cada teléfono al bajar ítems con `reminderAt`. |
| Datos de los widgets | SharedPreferences / App Group | ❌ | Se regeneran desde SQLite (`refreshWidgets`). |

## Modelo en Firestore (borrador)

```
users/{uid}
  profile                    → { displayName, onboardingDone, createdAt }
  settings/app               → { theme, accent, language, listSpacing, completedItemStyle,
                                 habitsInToday, coolHabits, updatedAt }
  items/{itemId}             → { …columnas de day_items, categoryId, updatedAt, deletedAt? }
  habitCompletions/{id}      → { habitId, date, updatedAt, deletedAt? }
  taskCompletions/{id}       → { taskId, date, updatedAt, deletedAt? }
  categories/{catId}         → { label, icon, color, sortOrder, spaceId?, updatedAt, deletedAt? }

spaces/{spaceId}             → { ownerUid, memberUids[], editorUids[], createdAt,
                                 deletedAt?, serverUpdatedAt }
  members/{uid}              → { name, joinedAt, leftAt?, updatedAt }
  config/category            → { label, icon, color, updatedAt }
  items/{itemId}             → { …igual que users/{uid}/items, sin categoryId }
  habitCompletions/{id}      → { habitId, date, byUid, updatedAt, deletedAt? }
  taskCompletions/{id}       → { taskId, date, byUid, updatedAt, deletedAt? }

inviteCodes/{code}           → { spaceId, createdBy, role: 'editor'|'viewer', expiresAt }
```

- Un documento por ítem (no un doc gigante), para subir y bajar solo lo que cambió
  (`where('serverUpdatedAt', '>', ultimaSync)`).
- `spaceId` = el id de la categoría que se comparte. Quien se une crea la categoría local con ese
  mismo id.
- **Pendiente de decidir en la Fase 4:** en un hábito compartido, ¿el completado es de cada
  persona (cada uno marca el suyo) o uno solo para todos (como una tarea)? El borrador guarda
  `byUid` para poder hacer cualquiera de las dos.

## Reglas de seguridad (borrador)

- `users/{uid}/**`: solo su dueño.
- `spaces/{id}`: leer si estás en `memberUids`; crear solo como dueño y único miembro; el dueño
  quita miembros, cambia roles (`editorUids` ⊆ `memberUids`) y elimina; un no-miembro se agrega
  **solo a sí mismo** con un código vigente de ese espacio, y solo a `editorUids` si el código es
  de editor; un miembro sale quitándose de los dos arreglos.
- **Límite de miembros**: al unirse, `memberUids.size() <= MAX_MEMBERS` (inviolable desde el
  cliente).
- `items`, `config`, completados: leer cualquier miembro; escribir solo `editorUids`.
- Códigos: 6 caracteres sin 0/O/1/I (32⁶ ≈ 10⁹), vencen a los 7 días; no se enumeran.
- Todo sin Cloud Functions; tests con el emulador (`firestore-tests/`), igual que My Wallet.

## Cómo funciona la sync

- **Subir:** cada escritura local marca `updated_at` y `sync_state = 'pending'`; `src/sync/`
  escribe en Firestore con el mismo id. La cola offline del SDK guarda la escritura aunque no haya
  internet o se cierre la app. Al confirmar, la fila pasa a `synced`.
- **Bajar:** al iniciar sesión, al abrir la app, al volver a primer plano (como mucho cada 30 s)
  y con un gesto manual (por definir dónde: deslizar hacia abajo en Today), se piden los docs con
  `serverUpdatedAt` posterior al cursor y se aplican en SQLite con `pickWinner`. Después se llama
  `dayItemsStore.reload()`, `refreshWidgets()` y se reprograman las notificaciones de lo que
  cambió.
- **Stores sin Firebase:** el motor escucha las escrituras del repositorio (un `onLocalChange`
  como en My Wallet) y aplica lo que baja por el repositorio, no por los stores.
- **Tiempo real en categorías compartidas:** empezar con pull incremental (como My Wallet). Un
  listener `onSnapshot` solo sobre los espacios, con la app abierta, es la mejora siguiente si se
  siente lento; vigilar lecturas.

---

## Fases

Tamaño aproximado: S (días), M (1–2 semanas), L (2–4 semanas).

### Fase 0 — Plan · S ✅ (2026-10-28)
- [x] Este documento y la rama `feature/pro-sync`.

### Fase 1 — Preparar los datos locales (sin red) · M ✅ (2026-10-28, falta probar en dispositivo)
Nada visible cambia; deja todo listo para que dos teléfonos no choquen.
- [x] **Ids únicos de verdad**: `domain/id.ts` → `newId()` (UUID v4 con `expo-crypto`). Antes eran
  `${type}-${Date.now()}` (`QuickAddSheet`), `task-${Date.now()}` (`inboxStore`),
  `cat-${Date.now()}` (`categoryRepository`) y `moment-${Date.now()}-${random}`
  (`pickMomentPhoto`): dos teléfonos podían generar el mismo. Los ids ya persistidos NO se migran
  (los referencian completados, notificaciones y widgets). Los completados de hábito/task
  (`habit_completions`/`task_completions`) ya eran determinísticos (`${id}-${date}`) — no
  necesitan UUID, ver borrado lógico abajo.
- [x] **Columnas de sync** en `day_items` (`category_id`, `deleted_at`, `sync_state`) y en
  `habit_completions`/`task_completions`/`categories` (`updated_at`, `deleted_at`, `sync_state`):
  en el `CREATE TABLE` para instalaciones nuevas + `ALTER TABLE` en try/catch para dispositivos
  existentes (`db.ts` → `addColumnIfMissing`).
- [x] **Borrado lógico**: `dayItemRepository.remove`/`categoryRepository.remove` marcan
  `deleted_at` en vez de `DELETE`; desmarcar un completado de hábito/task que repite también
  (reutiliza el mismo id determinístico al volver a marcar, en vez de insertar uno nuevo). TODAS
  las queries de `dayItemRepository`/`categoryRepository` lo excluyen — cubre también
  `widget/*Data.ts` y `widgetActions.ts`, que pasan por el repositorio, no por SQLite directo.
  Borrar el ítem dueño (`dayItemRepository.remove`) sigue borrando físico sus completados (una
  vez que el ítem se va, nadie necesita el historial día por día). Purga de tombstones viejos: no
  implementada todavía (no hay a qué "ya sincronizado" comparar sin nube; Fase 3).
- [x] **`category_id` resuelto y guardado** (`dayItemRepository` → `resolveCategoryId`, por nombre
  contra `categories.label`) en cada `upsert`, más backfill en `db.ts` para ítems existentes.
  **Alcance recortado de lo planeado**: por ahora es solo bookkeeping para la Fase 4 (saber qué
  ítems pertenecen a una categoría compartida) — `category`/`category_color` (texto) SIGUEN
  siendo la fuente que se muestra en pantalla, sin cambios visibles. Resolver en vivo por id (que
  renombrar/recolorear una categoría se refleje en sus ítems ya creados) queda para cuando se
  construya el filtrado por espacio en la Fase 4, tocando a la vez `dayItemsStore`/`inboxStore`/
  `useWeekAgenda`/los widgets — hacerlo ahora era más riesgo del que esta fase necesitaba.
- [ ] Tests de las migraciones: sin infraestructura de tests en este repo todavía (a diferencia
  de My Wallet, que usa Jest) — verificado a mano en dispositivo con datos reales en vez de un
  test automatizado. Jest se instala recién en la Fase 2 (ver ahí el porqué): lo que esta Fase 1
  toca es solo SQLite local, sin red, así que el riesgo de verificar a mano fue aceptable;
  `pickWinner` tampoco aplica todavía (no hay nada remoto con qué comparar hasta la Fase 3).

**Hecho cuando:** la app funciona igual que hoy, cada registro nuevo tiene id único y fecha de
edición, borrar/desmarcar deja tombstone en vez de eliminar, y un dispositivo con datos previos
migra sin perder nada — ✅ confirmado en el S24 Ultra con los 42 ítems reales del usuario (0
borrados, 0 perdidos). En el primer intento la migración se rompía con "no such column:
category_id" (bug real: el índice de `category_id` se creaba antes de agregar la columna en un
dispositivo con datos previos — corregido reordenando `db.ts`). Probado también: completar/
desmarcar un hábito (reutiliza su id determinístico) y crear/editar una tarea.

### Fase 2 — Firebase + cuentas con Google · M
- [x] **Instalar Jest** (2026-10-28): `jest`/`@types/jest`/`babel-jest`/`@types/node` +
  `jest.config.js` (mismo patrón que My Wallet: `testMatch` en `*.test.ts`, mock de
  `expo-crypto` vía `moduleNameMapper` porque es un módulo nativo que Jest-en-Node no puede
  cargar, `landing/`/`android/`/`ios/` ignorados). `npm test` corre la suite. Agregado
  `"types": ["node", "jest"]` al `tsconfig.json` — sin eso, TypeScript 6.0.3 (a diferencia de
  My Wallet, en 5.9.x) no incluía los globals ambient de `@types/node`/`@types/jest`
  automáticamente y `tsc --noEmit` fallaba con "Cannot find name 'it'/'expect'/`__dirname`".
  Agregado `src/sync/sync.boundary.test.ts` (guardia de la Regla #3) con solo el primer `it` de
  My Wallet — el segundo (que confirma que `src/sync/` sí importa Firebase) se suma recién
  cuando ese directorio tenga código real, para no dejar un test que siempre falla mientras
  `src/sync/` está vacío.
  Meld hoy no tiene NINGÚN OTRO framework de tests (ni la app ni `landing/`) — se verificó todo
  a mano en la Fase 1. A partir de acá, lo que entra a `src/sync/` y a `firestore.rules` sí
  necesita tests: son las dos cosas más fáciles de romper sin darse cuenta y más caras de
  debuggear a mano en un dispositivo. El resto del código (UI, domain) sigue sin tests por
  ahora, no hace falta migrar todo de una vez.
- [x] **`firebase-tools` + `@firebase/rules-unit-testing` + `firebase`** (2026-10-28): emulador
  de Firestore+Auth funcionando para `dev` sin depender de ningún proyecto real en la nube —
  usa el project id `demo-meld` (modo "demo" de Firebase: 100% local, no pega a ningún backend).
  `firebase.json` (`.firebaserc` → `demo-meld`), `firestore.rules` (niega todo por ahora, ver
  abajo), `jest.rules.config.js` + `firestore-tests/rules.test.ts` (2 tests: autenticado y sin
  autenticar, los dos niegos), `scripts/emulators.sh`/`scripts/test-rules.sh` (`npm run
  emulators`/`npm run test:rules`), mismo JDK 21 portátil que ya tenía instalado My Wallet
  (`~/.local/jdk-21`, Gradle sigue con Java 17 del sistema). **Puertos propios** (8090/9098/
  4010/4410/4510, no los defaults 8080/9099/4000/4400/4500): el emulador de `my-wallet-app`
  queda corriendo permanentemente en los default — mismo criterio que Metro en el 8081, no
  competir con él. Verificado de punta a punta: `npm run test:rules` levanta el emulador, aplica
  `firestore.rules`, corre los 2 tests y lo apaga limpio (sin puertos huérfanos).
- [x] **Reglas de Firestore que niegan todo** — hecho arriba, como parte del mismo paso.
- [x] **Proyectos reales en la consola de Firebase** (2026-10-28, hecho por el usuario):
  `meld-test-b197c` (`app.meld.mobile.test`) y `meld-prod-d6b61` (`app.meld`). Firestore edición
  Standard, `(default)`, región `nam5`, modo producción (deny-all, mismo punto de partida que
  `firestore.rules`). App Android registrada en cada uno con el SHA-1 de la debug keystore de
  este entorno (`9E:D3:E1:9D:E8:73:69:9E:0F:1D:22:5E:BE:4E:B6:59:13:7F:DB:41`) — falta sumar el
  SHA-1 de las keystores de EAS (`eas credentials`) cuando el usuario haga `eas login`.
  `google-services.test.json`/`google-services.prod.json` descargados a `firebase/` (no son
  secretos, van embebidos en el APK — se committean, mismo patrón que `my-wallet-app`).
  **Pendiente de confirmar**: Authentication → Sign-in method → Google habilitado en los dos
  proyectos (no confirmado todavía en esta conversación).
- [ ] `@react-native-firebase/app`/`auth`/`firestore` + `@react-native-google-signin/google-signin`
  (dependencias nativas: `prebuild --clean` + rebuild), `google-services.json` por variant.
- [ ] Ajustes → **Cuenta**: iniciar sesión, cerrar sesión, eliminar cuenta. Sin paso en el
  onboarding (Free no lo necesita); se ofrece al intentar algo Pro.
- [ ] `src/sync/` con cliente y sesión + test de frontera (Jest, como
  `sync.boundary.test.ts` de My Wallet: falla si algo fuera de `src/sync/` importa Firebase).

**Hecho cuando:** login, cierre de sesión y eliminación de cuenta funcionan en `dev` con el
emulador, sin tocar los datos locales.

### Fase 3 — Respaldo en la nube · L
- [ ] Push de todo lo marcado ✅ en el inventario; primera subida al iniciar sesión (traer → unir
  → subir).
- [ ] Pull en los disparadores de arriba; reprogramar notificaciones y refrescar widgets al bajar.
- [ ] Restaurar en un teléfono nuevo: inicia sesión → trae todo → salta el onboarding.
- [ ] Estado en Ajustes → Cuenta ("Respaldado hace…", "N cambios pendientes").
- [ ] Cerrar sesión con Mantener / Borrar (T8); eliminar cuenta borra `users/{uid}`.
- [ ] `pickWinner` (resolución de conflictos, `updatedAt`/tombstone) como función pura + tests
  Jest (sin red) — mismo patrón que `my-wallet-app/src/utils/syncMerge.ts`.
- [ ] Reglas de `users/{uid}` + tests Jest contra el emulador (`npm run test:rules`).
- [ ] Gating: solo Pro (o prueba) sube. Mientras no haya RevenueCat, usar `settingsStore.plan`
  detrás de un flag de `dev`/`test`.

**Hecho cuando:** desinstalar, reinstalar, iniciar sesión y ver exactamente lo mismo; y lo creado
en modo avión aparece en la nube al volver la conexión.

### Fase 4 — Categorías compartidas · L
- [ ] "Compartir" en `CategoriesManagerSheet`: crea `spaces/{id}` + código (con rol) y lo manda
  con la hoja del sistema. Solo Pro.
- [ ] "Unirme con un código" (en Categorías): se une y baja la categoría como una más. Invitados
  Free permitidos hasta el límite T10.
- [ ] Ítems de esa categoría viajan al espacio (no al respaldo personal); mover un ítem de una
  categoría compartida a otra le da un id nuevo + tombstone del viejo (D5 de My Wallet).
- [ ] Roles: el dueño elige "Puede editar / Solo ver" por persona; un lector no puede crear,
  editar, completar ni borrar en esa categoría (deshabilitar en Quick Add, detalle, swipe,
  checkbox y widgets).
- [ ] Salir, quitar a alguien, eliminar para todos; quien pierde el acceso conserva la categoría
  como propia (desconectada).
- [ ] Indicador en la fila de quién creó o completó un ítem compartido (por definir).
- [ ] Reglas de `spaces/**` e `inviteCodes` + tests Jest contra el emulador (incluye límite de
  miembros y roles editor/lector — casos obligados: un lector no puede escribir, el miembro
  N+1 no se puede unir).
- [ ] Pruebas con dos teléfonos y dos cuentas (Moto e7 plus + S24 Ultra), en `dev` + emulador y
  en `test` contra la nube real.

**Hecho cuando:** dos teléfonos con cuentas distintas comparten "Casa", los dos agregan y
completan tareas (con y sin internet) y ven lo mismo; un lector ve pero no puede editar.

### Fase 5 — Cobro real (RevenueCat) · M
- [ ] RevenueCat + productos en Play Console (US$7.99/mes, US$59.99/año, prueba de 14 días).
- [ ] La suscripción pasa a ser la fuente de verdad de `plan`; se quita la prueba simulada.
- [ ] Paywall en los momentos de fricción (al compartir, al activar el respaldo), no al abrir.
- [ ] Opcional: contador `spaceCount` en `users/{uid}` para que el límite de invitados Free sea
  inviolable en reglas.

### Fase 6 — Archivos (notas de voz y fotos) · M
- [ ] Pasar los proyectos a Blaze; Cloud Storage con reglas (`users/{uid}/media/**`,
  `spaces/{id}/media/**`).
- [ ] Copiar las fotos de Momentos a almacenamiento propio antes de subirlas.
- [ ] Subir y bajar audio y fotos en segundo plano; mostrar "Descargando…" en vez de "Audio
  eliminado".

### Fase 7 — Cumplimiento y publicación · S
- [ ] Política de privacidad y Data safety: qué se sube y dónde (Firebase, EE. UU.), cómo
  borrarlo.
- [ ] URL web para pedir la eliminación de la cuenta (requisito de Google Play).
- [ ] Actualizar `docs/play-store-checklist.md`, la landing ("Pro llega pronto" → disponible) y
  CLAUDE.md (Stack: "Sin backend" deja de ser cierto para Pro).

---

## Riesgos

- **Dos fuentes de lectura locales:** el headless del widget y la tarea de notificaciones leen
  SQLite directo; todas sus queries tienen que excluir `deleted_at` desde la Fase 1.
- **Notificaciones duplicadas o huérfanas:** al bajar un ítem editado en otro teléfono hay que
  cancelar y reprogramar su recordatorio; al bajar un borrado, cancelarlo.
- **Hábitos compartidos:** el modelo de completados (por persona o compartido) cambia rachas y
  heatmap; decidirlo antes de empezar la Fase 4.
- **Límites gratis de Firestore** (50K lecturas / 20K escrituras por día): holgados para uso
  personal; vigilar si se agregan listeners en tiempo real.
- **iOS:** sin verificar en este entorno; Sign in with Apple obligatorio al publicar ahí.

## Referencias

- `my-wallet-app/SYNC_ROADMAP.md` y `my-wallet-app/src/sync/` (diseño y código de referencia).
- Firebase pricing: https://firebase.google.com/pricing
- Cambios de Cloud Storage (requiere Blaze):
  https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- React Native Firebase: https://rnfirebase.io
- Eliminación de cuenta en Google Play: https://support.google.com/googleplay/android-developer/answer/13327111
