# SYNC_ROADMAP.md — Cuentas, respaldo y categorías compartidas (Pro)

Plan por fases para el plan **Pro** de Meld: cuenta con Google, respaldo y sync en la nube, y
**categorías compartidas** (listas que varias personas ven y editan). Iniciado 2026-10-28 en la
rama `feature/pro-sync`; `main` sigue 100% local y es lo que va a los testers de Play Console.
Adaptado del diseño ya probado en `my-wallet-app` (`SYNC_ROADMAP.md` de ese repo). Decisiones de
producto en `docs/decisions.md` (2026-10-27).

**Estado:** Fase 3 completa. Fase 4 (categorías compartidas) sustancialmente completa
(2026-11-06) — modelo de datos, motor de sync, "Compartir"/"Unirme con un código" y el gating de
lector, verificados de punta a punta con dos cuentas de Google reales en dos teléfonos. Quedan
sin construir: UI de roles por miembro existente / salir / quitar a alguien / eliminar el espacio,
el indicador de "quién creó/completó esto", y probar en variant `test` contra la nube real (hoy
solo verificado en `dev` contra el emulador).

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
| T10 | **Límites**: máx. **6** miembros por categoría compartida (`maxMembers()` en `firestore.rules`, probado — el 7mo no se une); un usuario Free puede estar en **2** categorías compartidas como invitado | Controla costo y deja un motivo claro para pasar a Pro. El límite de miembros lo exigen las reglas (server-side); el de categorías-como-invitado por usuario es solo de la app (sin Cloud Functions no hay contador server-side que lo haga cumplir de verdad — ver nota de `maxMembers()`). |
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
- [x] **Tests de las migraciones** (2026-11-11): `src/data/local/db.migrations.test.ts`, 6 tests.
  `initDb()` ganó un parámetro `conn: SqliteLike = sqlite` (default = la conexión real de
  `expo-sqlite`, ningún call-site de la app le pasa nada distinto) — permite inyectar en tests una
  conexión de `better-sqlite3` (devDependency nueva, habla SQLite real sin el runtime nativo de
  Expo), así los tests corren el SQL de las migraciones tal cual, sin reinterpretarlo. Mock nuevo
  `jest/expoSqliteMock.js` (igual patrón que `expoCryptoMock.js`) para que `db.ts` sea importable
  bajo Jest sin crashear (el `expo-sqlite` real no carga fuera de la app). Cubre: instalación nueva
  (tablas/columnas completas, siembra de categorías, idempotencia corriendo `initDb` dos veces) y
  dispositivo con datos previos (esquema viejo sin las columnas de Fase 4, agregar columnas sin
  perder filas, backfill de `category_id`, y la regresión real ya corregida de crear el índice de
  `category_id` antes de que la columna exista en una tabla vieja).

**Hecho cuando:** la app funciona igual que hoy, cada registro nuevo tiene id único y fecha de
edición, borrar/desmarcar deja tombstone en vez de eliminar, y un dispositivo con datos previos
migra sin perder nada — ✅ confirmado en el S24 Ultra con los 42 ítems reales del usuario (0
borrados, 0 perdidos). En el primer intento la migración se rompía con "no such column:
category_id" (bug real: el índice de `category_id` se creaba antes de agregar la columna en un
dispositivo con datos previos — corregido reordenando `db.ts`). Probado también: completar/
desmarcar un hábito (reutiliza su id determinístico) y crear/editar una tarea.

### Fase 2 — Firebase + cuentas con Google · M ✅ (2026-11-03)
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
  Authentication → Sign-in method → Google habilitado en los dos proyectos (confirmado por el
  usuario). Se sumó una tercera app Android dentro de `meld-test-b197c` con el paquete
  `app.meld.mobile` (el de dev) — dev y test comparten ese mismo `google-services.test.json`,
  cada uno resuelve su propio `webClientId` por paquete (`firebase/googleServices.js`).
- [x] **`@react-native-firebase/app`/`auth`/`firestore` + `@react-native-google-signin/
  google-signin`** (2026-11-03): `app.config.ts` resuelve `googleServicesFile`/
  `googleWebClientId` por variant, `src/sync/` tiene `firebase.ts` (cliente + conexión al
  emulador en `dev`, puertos propios 9098/8090), `session.ts`/`errors.ts`/`useSession.ts`/
  `index.ts` (iniciar/cerrar sesión, eliminar cuenta, todo detrás de `AuthError` tipado).
  Ajustes → sección **Cuenta** tiene el flujo de iniciar/cerrar sesión y eliminar cuenta (con
  `ConfirmDialog`, sin paso en el onboarding — se ofrece al intentar algo Pro), sin tocar
  Firestore todavía (eso es la Fase 3). `sync.boundary.test.ts` (ya existía desde el paso de
  Jest) confirma los dos lados: nada fuera de `src/sync/` importa Firebase, y `src/sync/` sí.
  **`expo prebuild --clean` + rebuild en dispositivo — hecho, con un bug real en el camino**:
  `@react-native-firebase/auth` 27.1.0 (firebase-bom 35.0.2) rompía `compileDebugKotlin` con
  "Module was compiled with an incompatible version of Kotlin" — el AAR de
  `firebase-auth-25.0.0` está compilado con metadata 2.4.0, y el Kotlin que resuelve Expo por
  default (2.0.21) solo lee hasta 2.1.0. Instalar `expo-build-properties` y subir
  `android.kotlinVersion` a 2.2.20 NO alcanzó (mismo error exacto) — el AAR en sí pedía más de
  lo que cualquier Kotlin 2.2.x puede leer. Lo que sí resolvió: bajar
  `@react-native-firebase/{app,auth,firestore}` a **26.0.0** (firebase-bom 34.15.0, un AAR de
  `firebase-auth` más viejo y compatible). Se deja igual la versión de Kotlin 2.2.20 vía
  `expo-build-properties` (ya la pedía el resto del árbol, sin relación con este bug puntual).
  Build `assembleDebug` verde, instalado y probado en un Samsung S24 Ultra (no en el Moto E7
  Plus de siempre — dispositivo distinto en esta sesión): la app abre con los datos reales del
  usuario sin crashear.
  **Login de punta a punta contra el emulador — confirmado (2026-11-03)**: con `npm run
  emulators` corriendo (puertos propios 9098/8090, `adb reverse` activo), iniciar sesión con
  Google, cerrar sesión, volver a iniciar sesión y eliminar cuenta funcionan los cuatro,
  verificados tanto en la UI (la fila de Cuenta cambia de estado en cada paso, el
  `ConfirmDialog` de eliminar se ve bien) como del lado del servidor (`GET
  identitytoolkit.googleapis.com/.../accounts:query` contra el emulador: 1 cuenta tras
  iniciar sesión, 0 tras eliminar). **Bug real encontrado y corregido en el camino**: el
  primer intento de login tiraba `DEVELOPER_ERROR` (código 10) de Google Sign-In — el SHA-1
  que se había registrado en Firebase era el de `~/.android/debug.keystore` (la global del
  sistema), pero `assembleDebug` firma con `android/app/debug.keystore` (local al proyecto,
  parte de la plantilla de Expo/RN, con una huella distinta:
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`). Corregido agregando esa
  huella a las apps `app.meld.mobile`/`app.meld.mobile.test` en `meld-test-b197c`.

**Hecho cuando:** login, cierre de sesión y eliminación de cuenta funcionan en `dev` con el
emulador, sin tocar los datos locales.

### Fase 3 — Respaldo en la nube · L (en curso, 2026-11-04)
- [x] `pickWinner` (resolución de conflictos, `updatedAt`/tombstone) como función pura + tests
  Jest — `src/sync/merge.ts`, sobre ISO strings (no epoch ms como `my-wallet-app`, ver el
  comentario del archivo).
- [x] Reglas de `users/{uid}` + tests Jest contra el emulador (`npm run test:rules`): el dueño
  lee/escribe cualquier subcolección (`items`/`habitCompletions`/`taskCompletions`/`categories`),
  nadie más — ni otro usuario autenticado ni sin sesión. `spaces/**` (Fase 4) sigue denegado.
- [x] Push de todo lo marcado ✅ en el inventario (items, `habitCompletions`, `taskCompletions`,
  categorías) — `src/sync/engine.ts` → `push()`, lee `sync_state = 'pending'` directo de SQLite
  (Fase 1 ya lo mantiene al día, no hace falta un mapa de versiones subidas aparte como en
  `my-wallet-app`). Primera subida al iniciar sesión vía `startSync()` → `onAuthStateChanged`.
- [x] Pull en los disparadores (sesión iniciada, primer plano cada 30s, `syncNow()` manual):
  decide con `pickWinner`, aplica en SQLite como `synced` (no vuelve a subir lo recién bajado),
  reprograma notificaciones (`syncReminderNotification`/`cancelReminderNotification`) y refresca
  widgets. Cambios locales disparan solo subida, con 3s de espera para agrupar (vía
  `src/data/local/localChanges.ts`, nuevo — pub-sub de "algo cambió en SQLite" para que
  `src/sync/` sepa sin que los repositorios importen Firebase).
- [x] Estado en Ajustes → Cuenta: fila "Respaldado hace…"/"Sincronizando…"/"Sin conexión"/"N
  cambios sin subir", tocarla sincroniza ya (`syncNow()`).
- [x] Eliminar cuenta borra `users/{uid}` completo (`deleteAllUserData`) antes de borrar el
  usuario de Firebase Auth.
- [x] Gating: `push()` exige `settingsStore.plan === 'pro'` (incluye la prueba simulada); `pull()`
  corre siempre, sin plan, para que alguien que tuvo Pro no pierda acceso a lo ya respaldado.
- [x] **Ajustes visuales sincronizan** (2026-11-04): `settingsStore.settingsUpdatedAt` (nuevo) se
  actualiza en cada setter sincronizable (tema/acento/idioma/espaciado/estilo de completado/
  hábitos en Hoy/hábitos "cool"/`onboardingCompleted`) vía el helper `touch()`, que además llama
  `emitLocalChange()` — mismo pub-sub y debounce de 3s que ya usan los repositorios de SQLite, sin
  que `settingsStore` importe Firebase (Regla #3). `src/sync/engine.ts` → `syncSettings()` compara
  con `users/{uid}/settings/app` (un solo documento, `src/sync/remote.ts` →
  `getUserSettingsDoc`/`setUserSettingsDoc`) vía el mismo `pickWinner` que los ítems — sin lista de
  pendientes ni tombstone, un documento no necesita ninguna de las dos. Corre en cada
  `syncOnce()`, con o sin `pull` (así un cambio de ajuste sin ítems de por medio también sube).
  Quedan afuera a propósito: `notificationsEnabled` (atado al permiso del SO de este teléfono, no
  algo que restaurar) y `plan`/prueba simulada (Fase 5, la fuente de verdad va a ser la
  suscripción). `deleteAllUserData` ahora también borra `settings/app`. **Verificado en
  dispositivo** (2026-11-04, Samsung S24 Ultra → Moto E7 Plus, misma cuenta): cambiar Tema a
  "Claro" en el S24 llegó solo al Moto (confirmado también por REST contra el emulador). **Bug
  real encontrado y corregido en el camino**: `getUserSettingsDoc` llamaba `snap.exists` como
  propiedad en vez de `snap.exists()` (método en la API modular de `@react-native-firebase/
  firestore`) — siempre truthy, así que nunca devolvía `null` para un doc inexistente y
  `snap.data()` tiraba `Cannot read property 'serverUpdatedAt' of undefined`, rompiendo CUALQUIER
  sync (no solo ajustes) apenas se agregó este código.
- [x] **Cerrar sesión con Mantener / Borrar (T8)** (2026-11-04): Ajustes → Cuenta → "Cerrar
  sesión" abre un diálogo que decide con `pendingChanges()`. Sin nada pendiente: "Mantener en el
  teléfono" (`signOutKeepingLocalData` — cierra sesión, limpia el cursor de sync, los datos del
  teléfono quedan igual) o "Borrar de este teléfono" (`signOutAndWipeLocalData` — además borra las
  4 tablas de SQLite vía `data/local/wipeLocalData.ts`, re-siembra las 3 categorías default igual
  que una instalación nueva, cancela notificaciones programadas y refresca stores/widgets/badge).
  Con algo pendiente, "Borrar" ni se ofrece — el diálogo explica que hay N cambios sin subir y solo
  deja cerrar sesión manteniendo los datos (nunca se pierde nada sin aviso, mismo criterio que
  `my-wallet-app`). Ninguna de las dos toca el respaldo en la nube — sigue ahí si se vuelve a
  iniciar sesión, en este teléfono o en otro.
- [x] **Verificación real en dispositivo** (2026-11-04): con el emulador corriendo, prueba de Pro
  activada y login real, el push subió los 42 `items`/55 `habitCompletions`/3 `categories` del
  seed (confirmado consultando el emulador por REST, no solo mirando la UI — los toques por
  `adb` seguían sin llegar de forma confiable a la pantalla en este Samsung). **Bug real
  encontrado y corregido en el camino**: las filas insertadas directo por SQL sin pasar por el
  repositorio (las 3 categorías default de `db.ts`, y los `habit_completions` del seed) quedaban
  con `sync_state` NULL — `listPendingSync()` solo buscaba `'pending'` exacto, así que esas filas
  nunca subían. `categories` daba 0/3 antes del fix, 3/3 después; `habitCompletions` iba a dar
  1/55 (solo lo tocado por `toggleHabitCompletion`, que sí usa el repositorio) — corregido
  tratando `sync_state IS NULL` como pendiente también, en los 3 repositorios
  (`dayItemRepository`/`categoryRepository`). No afecta a `day_items`, esa columna es
  `NOT NULL DEFAULT 'pending'` desde la Fase 1. Pull no se probó con datos reales todavía (nada
  que bajar en una cuenta nueva) — queda para una próxima sesión con un segundo dispositivo o una
  reinstalación.

**Hecho cuando:** desinstalar, reinstalar, iniciar sesión y ver exactamente lo mismo; y lo creado
en modo avión aparece en la nube al volver la conexión.

### Fase 4 — Categorías compartidas · L
- [x] **"Compartir" en `CategoriesManagerSheet`** (2026-11-05): ícono de compartir en cada fila
  (antes del chevron) — `share` si la categoría es personal, `users` en acento si ya está
  compartida y soy editor; oculto si soy lector de un espacio ajeno (no puedo invitar con más
  permiso del que tengo, ver `firestore.rules`). Abre `ShareCategorySheet.tsx` (mismo patrón
  visual que `CategoryFormModal`): gatea sesión iniciada y plan Pro ANTES de intentar nada (T3/T9
  — solo quien comparte necesita Pro, quien se una no); con los dos, elige rol ("Puede editar"/
  "Solo ver") y "Generar código y compartir" → `src/sync/engine.ts` → `shareCategory(categoryId)`
  (solo la primera vez; si ya está compartida, salta directo a generar otro código) +
  `createCategoryInviteCode(spaceId, role)`, código mostrado grande en pantalla + botón que abre
  la hoja de compartir del sistema (`Share.share`, sin pedir nada nuevo: `Share` es parte de
  React Native). `domain/inviteCode.ts` → `generateInviteCode()` (6 caracteres sin 0/O/1/I, ver
  "Reglas de seguridad"); `createCategoryInviteCode` reintenta con otro código al azar si el
  generado ya existe (colisión rarísima — `firestore.rules` rechaza un `create` sobre un id ya
  usado, eso nunca es un `update`).
  - `shareCategory(categoryId)`: crea `spaces/{categoryId}` (mismo id que la categoría, ver el
    comentario largo en `data/local/schema.ts` → `categories.spaceId`) + `config/category`, liga
    la categoría local (`categoryRepository.setSpaceLink`) y migra sus ítems/completados YA
    EXISTENTES al espacio — `dayItemRepository.migrateCategoryToSpace(categoryId)` (nuevo: marca
    `spaceId`/`pending` a todo lo que tenga esa `categoryId`, sin tocar su `id` — a diferencia de
    D5 de My Wallet, acá el ítem no cambia de categoría, es la categoría la que pasa de personal a
    compartida) + `habitCompletionSyncRepository.migrateForHabits`/
    `taskCompletionSyncRepository.migrateForTasks` (mismo criterio, para los completados de los
    hábitos/tasks que esa migración encontró). Lo que ya se había subido como personal
    (`users/{uid}/items`/`.../categories`) se tombstona de verdad con el nuevo
    `remote.ts` → `deletePersonalDocs(uid, kind, ids)` — de ahí en más esa categoría y su
    contenido viven solo en `spaces/{id}/...`. Nuevo `remote.ts` → `createSpaceDoc`,
    `createInviteCode` (`expiresAt` como `Timestamp` real — `firestore.rules` exige
    `is timestamp`, vence a los 7 días).
  - **Verificado en dispositivo** (2026-11-05, S24 Ultra, contra el emulador): compartir "Casa"
    generó el código correcto en pantalla; confirmado por REST que `spaces/{id}` quedó con
    exactamente los campos que exige `allow create` de las reglas, `config/category` con el
    label/ícono/color de la categoría, `inviteCodes/{code}` con `expiresAt` como `Timestamp` a 7
    días; un ítem que ya vivía en esa categoría (creado antes de compartirla, ya subido como
    personal) se migró solo a `spaces/{id}/items` con el mismo id y SIN quedar duplicado en
    `users/{uid}/items` (confirmado por REST, la query a personal volvió vacía). `npx tsc
    --noEmit` limpio, 24 tests en verde — íconos `share`/`users` nuevos en
    `domain/iconNames.ts`/`components/Icon.tsx` (Lucide `Share2`/`Users`).
  - **Pendiente, documentado a propósito**: sin paywall real todavía (gatea con
    `settingsStore.plan`, igual que el resto de "Roadmap Pro"); `getSpaceMember`/`setSpaceMember`
    de `remote.ts` (listos desde el paso del modelo de datos) todavía sin usar — la fila
    `members/{uid}` se escribe recién en el paso de "Unirme con un código" que sigue.
- [x] **"Unirme con un código"** (2026-11-05): botón ícono `link` en el header de
  `CategoriesManagerSheet` (junto a "+"/"✕") abre `JoinCategorySheet.tsx` (mismo patrón visual):
  input de 6 caracteres (auto-mayúsculas) + "Unirme" → `src/sync/engine.ts` →
  `joinCategoryWithCode(code)`. Sin gate de plan en el render (a diferencia de
  `ShareCategorySheet`: T9, un invitado Free participa igual) — valida lo que se puede
  localmente ANTES de tocar Firestore (sesión iniciada, límite T10 vía nuevo
  `invitedCategoryCount(uid)` — cuenta `categoryRepository.listSpaceLinked()` con
  `ownerUid !== uid`, máx. 2 para Free) para un mensaje preciso; lo demás —código inválido/
  vencido (`remote.ts` → `getInviteCode`, sí legible sin ser miembro: `allow get: if
  signedIn()`), ya ser miembro, espacio lleno o eliminado— cae en un error genérico `denied`
  (`JoinCodeErrorKind`, mapeado a texto por `JoinCategorySheet.tsx`). Al unirme, pide una traída
  (`requestSync({ pull: true })`): el próximo `pullSpaces` descubre el espacio nuevo y crea la
  categoría local sola, mismo camino ya probado en el paso del motor de sync — este sheet no
  espera a verla, solo confirma "listo".
  - **Bug real encontrado (y corregido) probando con un segundo usuario de verdad**: el primer
    diseño de `joinSpace` leía `spaces/{id}` primero (`getSpaceDoc`) para construir
    `memberUids`/`editorUids` a mano (anterior + mi uid) antes del `update` — pero
    `firestore.rules` exige YA SER MIEMBRO para `allow get` de un espacio, así que ese `getDoc`
    revienta con `PERMISSION_DENIED` para cualquiera que todavía no se unió, rompiendo el flujo
    completo. Corregido con `arrayUnion()` (`remote.ts` → `joinSpace`): las reglas evalúan
    `request.resource.data` ya resuelto (con el `arrayUnion` aplicado), así que
    `memberUids.size() == resource.data.memberUids.size() + 1` sigue funcionando sin que el
    cliente conozca el arreglo anterior — nunca hace falta leer el espacio antes de unirme.
    `getSpaceDoc` se quitó de `remote.ts` (quedaba sin uso real).
  - **Verificado contra las reglas reales con un segundo usuario** (2026-11-05, emulador): se creó
    una cuenta de prueba en el emulador de Auth (`accounts:signUp`, distinta de la cuenta dueña) y
    se repitió EXACTAMENTE lo que hace `joinSpace` (transform `appendMissingElements`, el
    equivalente REST de `arrayUnion`) con el `idToken` de esa cuenta — confirmado: un `GET` de
    `spaces/{id}` sin ser miembro da `PERMISSION_DENIED` (reproduce el bug de arriba tal cual se
    habría visto en producción); el `update` con `arrayUnion` fue aceptado y el documento quedó
    con el segundo uid en `memberUids`/`editorUids`, sin que el cliente leyera nada antes; con la
    membresía ya puesta, esa cuenta SÍ pudo leer `spaces/{id}` y crear su propia fila en
    `members/{uid}`. `npx tsc --noEmit` limpio, 24 tests en verde.
  - **Pendiente, documentado a propósito**: todavía no se probó el camino completo con la app de
    verdad en dos teléfonos con cuentas de Google reales (solo REST contra el emulador) — eso es
    la tarea de abajo ("Pruebas con dos teléfonos y dos cuentas"), que a esta altura es lo único
    que falta para considerar el flujo "Compartir"/"Unirme" end-to-end terminado.
- [x] **Gating de un lector** (2026-11-05): `categoriesStore.readOnlyLabels` (`Set<string>`,
  recalculado en `load()`) — labels de categorías compartidas donde mi rol es `'viewer'`. Por
  `label`, no `id`: mismo criterio que `DayItem.category` (texto copiado, ver CLAUDE.md →
  "Categorías configurables"), consistente con cómo toda la app ya resuelve a qué categoría
  pertenece un ítem.
  - `CategoryChips.tsx`: nunca ofrece una de solo lectura para elegir (filtra
    `selectableCategories`) — cubre crear (`QuickAddSheet`) y reclasificar
    (`ItemDetailSheet`) a la vez. `QuickAddSheet` además bloquea "Agregar" si la categoría ya
    viene así por un prefill de Agregar por voz (`voiceParser.ts` matchea por texto libre,
    podría colarse un nombre que coincide).
  - `TodayItemRow.tsx` (Today + agenda Semana, que la reusa): si `item.category` es de solo
    lectura, no pasa `onDelete`/`onToggleComplete`/`onToggleHabitComplete`/`onDashPress` —
    sin swipe, sin completar, sin reagendar hora. `onPress` sigue abriendo el detalle, para VER.
  - `ItemDetailSheet.tsx`: con un ítem de solo lectura, banner arriba ("Solo puedes ver este
    ítem...") + todo el formulario editable envuelto en `pointerEvents="none"` + opacidad (más
    simple y robusto que agregarle `disabled` a cada `FieldRow`/`TimeFieldRow`/etc. sueltos, que
    hoy no lo tienen) + `confirmDisabled` siempre `true` — ningún cambio local llega a
    persistirse aunque el formulario "se vea" tocable.
  - **Dos caminos que bypasan la UI por completo, encontrados al auditar** (no estaban en la
    lista original del roadmap, pero son el mismo hueco que widgets): `widget/widgetActions.ts`
    (`toggleTaskCompleteFromWidget`/`toggleHabitCompleteFromWidget`) y
    `services/notificationActions.ts` (`completeItemFromNotification`, el botón "Marcar hecho"
    de la bandeja de notificaciones) mutan la DB directo, sin stores — ambos ahora consultan
    `categoryRepository.list()` (sin store, corren headless) y no hacen nada si la categoría del
    ítem es de solo lectura.
  - **Verificado en dispositivo** (2026-11-05, S24 Ultra): se simuló ser lector de una categoría
    AJENA (espacio sembrado por REST con `ownerUid` de un segundo usuario de prueba, mi cuenta
    agregada a `memberUids` pero NO a `editorUids` vía `arrayUnion`, mismo mecanismo ya probado
    en "Unirme con un código") — confirmado: tocar el checkbox de su ítem en Today no cambia el
    contador; deslizar la fila no revela el botón de eliminar; el detalle muestra el banner y
    "Actualizar tarea" atenuado/deshabilitado; Quick Add no ofrece esa categoría entre las
    opciones para elegir. `npx tsc --noEmit` limpio, 24 tests en verde.
  - **Pendiente, documentado a propósito**: sin UI todavía para que el dueño elija el rol de
    cada MIEMBRO existente uno por uno (solo se elige el rol al generar un código nuevo, ver
    `ShareCategorySheet`) — cambiar el rol de alguien que ya se unió (T11) no tiene pantalla
    propia; tampoco hay indicador de "quién creó/completó esto" en la fila (ver el ítem de abajo,
    "por definir" desde el modelo de datos).
- [x] **Roles por miembro / salir / quitar / eliminar** (2026-11-06): `ShareCategorySheet.tsx` se
  amplía con una sección "Miembros" cuando la categoría ya está compartida — nombre y rol de cada
  quien, vía nuevo `engine.ts` → `listCategoryMembers(spaceId)` (combina `getSpaceDoc` +
  `listSpaceMembers`, el rol vive en `editorUids`/`memberUids` del espacio, no en `members/{uid}`).
  El dueño puede tocar el chip de rol de cualquier miembro (`changeMemberRole` — reconstruye
  `editorUids` entero; la regla de Firestore para esto exige el arreglo completo con el dueño
  siempre adentro, no admite `arrayUnion`/`arrayRemove` de un elemento) y quitarlo
  (`removeMemberFromCategory`). Al final del sheet: el dueño ve "Eliminar categoría compartida"
  (`deleteCategorySpace`, marca `deletedAt`); un invitado ve "Salir de esta categoría"
  (`leaveCategorySpace`) — ambos desvinculan la categoría LOCALMENTE al instante
  (`unlinkSpaceLocally`, el mismo trío de llamadas que ya hacía `pullSpaces` al descubrir un
  espacio muerto, factorizado y llamado aparte para no esperar al próximo ciclo de sync); los
  demás miembros se enteran en su propio próximo `pullSpaces` (mismo mecanismo ya probado:
  `discoverSpaces` deja de traer el espacio en cuanto el uid sale de `memberUids`, o lo trae con
  `deletedAt` si el dueño lo eliminó).
  - **Dos bugs reales encontrados probando con las dos cuentas reales**: (1) el gate de plan Pro
    bloqueaba TODO el contenido del sheet sin mirar si la categoría ya estaba compartida, así que
    un invitado Free (que según T9 nunca necesita Pro) ni siquiera podía ver la lista de miembros
    o salir — corregido: el gate de Pro solo aplica a compartir una categoría NUEVA
    (`!alreadyShared`). (2) `shareCategory()` nunca creaba la fila `members/{uid}` del DUEÑO
    (solo `joinCategoryWithCode` la creaba, para quien se une) — el invitado veía el uid crudo
    del dueño en vez de su nombre; corregido hacia adelante (ahora también crea su fila) y con un
    autofix retroactivo (`ensureMyMemberRow`, llamado desde `loadMembers()` cuando el dueño
    detecta que su propia fila falta — solo puede arreglar la suya, las reglas no dejan escribir
    la de otro, pero cada quien se autocura al abrir el sheet).
  - **Verificado en dispositivo** (2026-11-06, Moto E7 Plus + S24 Ultra, dos cuentas reales,
    mismo par de la verificación de "Compartir"/"Unirme"): lista de miembros con nombres
    correctos en ambos lados tras el autofix; botón "Eliminar"/"Salir" correcto según quién mira.
    `npx tsc --noEmit` limpio, 24 tests en verde.
  - **Los 4 flujos verificados de punta a punta en dispositivo** (2026-11-06, mismo par de
    teléfonos y cuentas reales), cada uno confirmado por REST contra Firestore además de en
    pantalla:
    - **Cambiar rol** (dueño pasa al invitado a lector): `editorUids` quedó sin su uid
      (`memberUids` intacto); en el Moto, sin recargar más que reabrir la app, el checkbox dejó
      de reaccionar y el detalle mostró el banner de solo lectura — el gating de lector ya
      verificado en un paso anterior reacciona también a un cambio de rol EN VIVO, no solo al
      unirse ya como lector.
    - **Quitar a alguien** (dueño quita al invitado): `memberUids` quedó solo con el dueño, la
      fila `members/{invitado}` se borró; tras reabrir la app en el Moto, "Work" pasó a verse
      como categoría personal (mismo ícono `share` que una categoría nunca compartida).
    - **Salir** (el invitado sale por su cuenta, re-unido con un código nuevo para esta prueba):
      `memberUids` quedó sin su uid (`editorUids` conservó el rastro inerte, tal como lo exige la
      regla — ver el comentario de `leaveSpace` en `remote.ts`); en el Moto, SIN recargar nada
      (la desvinculación es local e instantánea, `unlinkSpaceLocally`), "Work" ya se veía
      personal apenas se confirmó el diálogo.
    - **Eliminar el espacio** (dueño elimina, invitado re-unido de nuevo para esta prueba):
      `deletedAt` quedó seteado; en el S24 (quien ejecutó la acción) la desvinculación fue
      instantánea igual que "Salir"; en el Moto (quien no la ejecutó) hizo falta reabrir la app
      para que su propio `pullSpaces` descubriera el `deletedAt` y desvinculara — confirmando que
      **el dueño también pierde el vínculo al eliminar**, no solo los invitados.
- [x] **Indicador en la fila de quién completó un ítem compartido** (2026-11-11). Alcance
  resuelto por el lado simple: un ítem/hábito compartido sigue siendo UNA sola fila de completado
  por fecha (sin fork de comportamiento por persona); lo nuevo es solo la ATRIBUCIÓN. Se dejó
  fuera "quién CREÓ el ítem" (solo completado) — la señal realmente útil día a día, documentado a
  propósito como pendiente menor.
  - **Esquema**: columna `completed_by_uid` (nullable) en `day_items`/`habit_completions`/
    `task_completions` (`db.ts`, `addColumnIfMissing`). Nueva tabla `space_members` (caché local
    de `uid → name` por espacio, poblada en cada `pullSpaces()` reusando `listCategoryMembers`) —
    evita pegarle a la red por fila al pintar el badge.
  - **Estampado** (`engine.ts` → `pushSpaces()`): si el campo local es `null` y el ítem está
    `done`, se fija a `currentUid()` y se persiste ANTES de subir — queda fijo la primera vez,
    nunca se pisa en ediciones futuras de otra persona. Se limpia a `null` al descompletar una
    task sin repetir, o al reusar una fila de completado de hábito/task que repite (re-completar
    atribuye a quien lo hizo esta vez, no a quien lo había hecho antes).
  - **UI**: nuevo `TrailingBadge: {kind:'completedBy', name}` en `DayItemRow.tsx`, precedencia más
    baja (el primero en caerse). Solo se muestra si lo completó ALGUIEN MÁS (nunca para mis
    propios completados). `completedByUid`/`spaceId` NO se agregaron a `DayItem` del dominio
    (bookkeeping de sync, igual que `categoryId` — CLAUDE.md).
  - **Bug real encontrado y corregido en la verificación**: compartir de nuevo una categoría que
    ya tuvo un espacio eliminado antes fallaba ("No se pudo compartir la categoría") — el
    documento `spaces/{id}` sigue existiendo en Firestore (solo `deletedAt`, nunca se borra de
    verdad), así que un `setDoc` ahí es un `update` para las reglas, no un `create`, y ninguna
    rama de `allow update` admite reescribir todo el documento de una. Arreglado con
    `reviveSpaceDoc()` (`remote.ts`): dos `updateDoc` secuenciales (`memberUids`+`deletedAt`,
    después `editorUids`) que reinician el espacio limpio con solo el dueño adentro, en vez de
    arrastrar a quien ya estaba antes de eliminarlo.
  - **Segundo bug encontrado y corregido**: el badge no aparecía en la agenda Semana de
    Calendario aunque el dato ya estaba sincronizado — `completedByMap` vivía solo en
    `dayItemsStore` (acoplado al `selectedDateKey` de Today), y la agenda Semana trae ítems de
    varios días por su cuenta (`useWeekAgenda`) sin pasar por ese reload. Arreglado dándole a
    `useWeekAgenda` su propio `completedByMap` (poblado en su propio `reload()`), pasado a
    `TodayItemRow` vía la prop `completedByUidOverride` (si no se pasa, cae al mapa global de
    Today — Today sigue sin necesitarla, ahí el ítem se oculta al completarse de todos modos).
  - **Verificado de punta a punta en dispositivo** (S24 + Moto, cuentas reales): se completó un
    ítem de la categoría compartida "Work" desde el Moto (invitado) y el S24 (dueño) mostró
    "✓ Hernán Blan…" en la fila, en Calendario → Semana (Today oculta las completadas, así que
    ahí nunca se vería — comportamiento esperado, no un hueco de esta feature).
- [x] **Modelo de datos + reglas de `spaces/**` e `inviteCodes` + tests** (2026-11-04): diseño
  adaptado de `my-wallet-app/firestore.rules` (mismo patrón de roles/límites — funciones
  `isMember`/`isMemberAfter`/`canWrite`/`isOwner`/`isEditor`/`isEditorAfter`/`canEdit`,
  `maxMembers() = 6`), con las subcolecciones de Meld en vez de las de My Wallet:
  `items`/`habitCompletions`/`taskCompletions` (en vez de `transactions`) y `config/category` (en
  vez de `config/list`). `members/{uid}` queda más simple que en My Wallet — sin la variante
  "persona sin app" (Meld no la tiene): una fila por persona, id = su propio uid, que cualquier
  miembro crea/edita para sí (el dueño también puede tocar la de otro, para quitarlo). Tipos puros
  en `src/sync/mappers.ts` (`SpaceDoc`/`SpaceMemberDoc`/`SpaceCategoryDoc`/`InviteCodeDoc`/
  `SpaceItemDoc` + `dayItemToSpaceDoc`/`docToDayItemFromSpace`) — sin Firebase, Regla #3; `remote.ts`/
  `engine.ts`/UI quedan para un paso aparte. **32 tests nuevos** en `firestore-tests/rules.test.ts`
  (`npm run test:rules`), cubriendo: crear espacio (dueño=self, editorUids=[self]), leer/escribir
  como miembro, un no-miembro no lee nada, descubrir por `memberUids array-contains`, unirse con
  código (vigente/vencido/inexistente/de otro espacio/espacio eliminado), códigos no se enumeran,
  límite de 6 miembros (el 7mo falla, el 6to entra), roles editor/lector (código de editor suma a
  `editorUids`, de lector no; un lector no escribe ítems/config pero sí lee; solo el dueño cambia
  roles, nadie se autopromueve; legado sin `editorUids` = todos editores; un lector solo invita
  como lector), mi propio miembro (nadie edita la fila de otro salvo el dueño), salir/quitar/
  eliminar (salir en lote, el dueño quita pero no se autoagrega/autoquita, eliminar marca +
  permite borrar todo + los demás dejan de leer).
- [x] **Datos locales (SQLite)** (2026-11-04): columnas nuevas, todas opcionales/`NULL` por
  default (ver el comentario largo en `data/local/schema.ts` → `categories.spaceId`) —
  `categories.space_id`/`space_role`/`space_owner_uid` (vínculo con el espacio + mi rol +
  quién es el dueño, cacheados localmente); `day_items.space_id`,
  `habit_completions.space_id`, `task_completions.space_id` (a qué colección sube cada fila:
  `null` = personal como siempre, si no `spaces/{spaceId}/...`). Migradas con
  `addColumnIfMissing` en `db.ts` para instalaciones existentes, incluidas en el `CREATE TABLE`
  para instalaciones nuevas. `domain/category.ts` → `Category.space?: CategorySpaceLink`
  (`{ spaceId, role, ownerUid }`, `undefined` = categoría personal).
  `categoryRepository.setSpaceLink()` (nuevo) liga/desliga una categoría a un espacio — todavía
  sin flujo de UI que lo llame, lo usan los pasos de "Compartir"/"Unirme"/"Salir" que siguen.
  `dayItemRepository`: `upsert()` resuelve `space_id` desde la categoría del ítem al guardar
  (así un ítem NUEVO creado directo en una categoría compartida ya queda bien etiquetado, aunque
  Quick Add todavía no distingue categorías compartidas de personales);
  `toggleHabitCompletion`/`toggleTaskCompletion` copian el `space_id` del hábito/task dueño al
  crear el primer completado (estable de ahí en más — ver el porqué en el comentario de
  `resolveSpaceId`). `listPendingSync()` de ítems y completados ahora exponen `spaceId`, para que
  el motor de sync (próximo paso) pueda enrutar cada fila a `users/{uid}/...` o
  `spaces/{spaceId}/...` sin un JOIN extra. **Pendiente, documentado a propósito**: D5 (mover un
  ítem existente entre categoría personal/compartida = id nuevo + tombstone del viejo, nunca
  reasignar `space_id` en el mismo id) todavía no tiene flujo — hoy nada en Quick Add/detalle
  distingue categorías compartidas, así que ese cruce de límite ni se puede intentar desde la UI
  todavía. 21 tests (`npm test`) siguen en verde, incluye 1 nuevo para
  `dayItemToSpaceDoc`/`docToDayItemFromSpace`. **Verificado en dispositivo** (2026-11-04, Moto E7
  Plus, instalación con 25 ítems reales de sesiones anteriores): la migración corrió limpio, sin
  errores de SQLite; Today cargó los mismos 25 ítems de siempre y la sync siguió sincronizando
  ("Respaldado Ahora mismo" en Ajustes → Cuenta) — las columnas nuevas no rompieron nada.
- [x] **Motor de sync (traer y subir)** (2026-11-04): `src/sync/remote.ts` generaliza
  `pullCollection`/`pushBatch` (ya no hardcodean `users/{uid}`) y agrega `discoverSpaces`
  (`memberUids array-contains uid`, incluye espacios eliminados — así el motor se entera y
  desconecta), `pullSpaceCollection`/`pushSpaceBatch` (mismo `pullPaged`/`pushBatchTo` que lo
  personal, apuntando a `spaces/{spaceId}/...`), `getSpaceConfig`/`setSpaceConfig`,
  `getSpaceMember`/`setSpaceMember` (estos dos últimos sin usar todavía — para el paso de UI).
  `src/sync/meta.ts` → `CursorKey` ahora admite `space:{id}:{kind}` además de la clave personal
  simple, más `forgetSpace()` (limpia los cursores de un espacio al desconectarlo, para una
  traída completa si se vuelve a unir). `src/sync/engine.ts`:
  - `pullSpaces(uid, meta)`: descubre mis espacios, desconecta localmente los que ya no viven
    (`categoryRepository.unlinkSpace` + el mismo método en `dayItemRepository`/
    `habitCompletionSyncRepository`/`taskCompletionSyncRepository` + `forgetSpace`), y para cada
    espacio vivo trae `config/category` (`categoryRepository.applySpaceUpsert` — crea la
    categoría local la primera vez, `id = spaceId`) + items/habitCompletions/taskCompletions
    (mismo `pickWinner` que lo personal, `applySpaceRemoteUpsert` en vez de `applyRemoteUpsert`).
    Corre siempre que `pull()` corre (junto al personal), nunca gateado por plan.
  - `pushSpaces()`: agrupa lo pendiente (`listPendingSync()` de las 4 tablas) por `spaceId`,
    sube cada grupo a `spaces/{spaceId}/...` (`dayItemToSpaceDoc`, sin `categoryId`) y la
    categoría a `config/category` en vez de `users/{uid}/categories`. Sin gate de plan (T9: un
    invitado Free participa igual, solo el dueño necesitaba Pro para compartir) — a diferencia
    de `push()` (personal), que sí sigue gateado.
  - `pushItems`/`pushHabitCompletions`/`pushTaskCompletions`/`pushCategories` (personales) ahora
    filtran `spaceId == null` — antes de este cambio subían TODO lo pendiente mezclado, lo que
    habría duplicado/corrompido cualquier fila ligada a un espacio subiéndola también a
    `users/{uid}/...` (bug encontrado leyendo el código antes de que llegara a pasar en
    dispositivo, no en producción).
  - `src/domain/category.ts`/`CursorKey` tests nuevos en `meta.test.ts` (independencia de
    cursores entre espacios y de lo personal, `forgetSpace`). 24 tests en verde.
  **Verificado en dispositivo** (2026-11-04, Moto E7 Plus, espacio sembrado a mano por REST
  contra el emulador — sin UI de compartir/unirse todavía): `discoverSpaces` encontró el espacio
  sembrado; `pullSpaces` creó la categoría local "Casa" con el ícono/color de `config/category`;
  trajo el ítem sembrado ("Comprar leche") y apareció en Today/búsqueda; al borrar el espacio en
  Firestore y reabrir la app, "Casa" se desligó sola y se subió como categoría PERSONAL nueva a
  `users/{uid}/categories` (confirmado por REST) — exactamente "quien pierde el acceso conserva
  la categoría como propia". **Bug real encontrado y corregido en el camino**: la semilla manual
  por REST no traía `serverUpdatedAt` (campo que en producción pone `pushBatch`/`pushSpaceBatch`
  automático vía `serverTimestamp()`) — sin él, la query `where('serverUpdatedAt' >= cursor)` de
  `pullPaged` nunca encuentra el documento (Firestore excluye de un filtro de rango lo que no
  tiene el campo), así que el ítem sembrado no bajaba aunque el espacio sí se descubriera bien;
  no es un bug del motor, es una nota para la próxima vez que se sembren datos a mano por REST.
  **Push de un ítem creado por la UI, confirmado** (2026-11-05, S24 Ultra, mismo espacio
  sembrado por REST pero el ítem esta vez creado de verdad desde Quick Add en la categoría
  "Casa", no sembrado a mano): la primera prueba (editar el ítem SEMBRADO por REST para
  marcarlo hecho) subió por error a `users/{uid}/items` (personal) en vez de a
  `spaces/{id}/items` — causa: esa semilla manual no traía el campo `category` (texto copiado)
  que `dayItemRepository.upsert()` usa para re-resolver `categoryId`/`spaceId` al guardar una
  edición, así que al guardar perdía el vínculo con el espacio. Confirmado que es un hueco de la
  semilla y no del motor: un ítem creado "Prueba espacio real" directo en Quick Add eligiendo la
  categoría "Casa" (con `category: 'Casa'` copiado como cualquier ítem, igual que en Fase 1) se
  subió correctamente a `spaces/s1/items` (verificado por REST, nunca apareció en
  `users/{uid}/items`), y al marcarlo hecho desde la app la actualización (`status: 'done'`)
  también llegó a `spaces/s1/items` — el round-trip categoría→espacio se sostiene con datos
  reales. Con esto el motor de sync (traer y subir) queda verificado de punta a punta.
- [x] **Pruebas con dos teléfonos y dos cuentas reales** (2026-11-06, Moto E7 Plus + S24 Ultra,
  variant `dev` contra el emulador): cada teléfono con su propia cuenta de Google real (no
  simuladas por REST, a diferencia de las verificaciones anteriores de esta fase). El dueño
  compartió "Work" desde `ShareCategorySheet` y generó un código; el invitado se unió desde
  `JoinCategorySheet` con ese código — sin ninguna intervención manual por REST, solo las dos
  pantallas ya construidas. Confirmado por REST que `spaces/cat-work` quedó con las dos cuentas
  reales en `memberUids`/`editorUids`. El dueño creó "Prueba cruzada" en esa categoría desde
  Quick Add → apareció en el teléfono invitado; el invitado la marcó hecha → el dueño la vio
  hecha también (confirmado `status: 'done'` en `spaces/cat-work/items` por REST en ambos
  sentidos). Push, pull y el gating de UI ya verificados en pasos anteriores quedan así
  confirmados también con el flujo 100% real de punta a punta.
  - **Pendiente, documentado a propósito**: no se probó todavía en variant `test` contra la nube
    real (solo `dev` contra el emulador) — mismo código, infraestructura distinta; se deja para
    antes de publicar. Tampoco se probó el camino offline (crear/completar sin internet y que
    sincronice al volver la conexión) ni el de un LECTOR real en dos cuentas (el gating de lector
    se verificó por separado, simulando el rol — ver el ítem de arriba).

**Hecho cuando:** dos teléfonos con cuentas distintas comparten "Casa" (o cualquier categoría),
los dos agregan y completan tareas y ven lo mismo — **confirmado 2026-11-06**. Queda para después
de esta fase: probar con y sin internet, y en `test` contra la nube real (ver el punto de arriba).

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
