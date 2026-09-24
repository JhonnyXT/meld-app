@AGENTS.md

# Meld

Planificador diario en Expo/React Native (iOS + Android) que reúne tareas, eventos,
hábitos, notas, notas de voz y fotos en una vista por día. Ver el spec de producto
completo en el artifact "Meld — Spec de Desarrollo" (Claude, publicado por el dueño
del proyecto — pedirle el link si hace falta releerlo; se retituló junto con el
rename de 2026-08-27, ver abajo). El proyecto se llamó "Anchor"
hasta el 2026-08-21, cuando se renombró a "Trove", y "Trove" hasta el 2026-08-27,
cuando se renombró a **Meld** (nombre definitivo, decidido en la sesión de consulta
de producto — mismo producto, misma arquitectura y roadmap en los dos renames,
solo cambió el nombre/logo/lema).

## Stack

- Expo SDK 57 (managed, New Architecture), Expo Router, TypeScript estricto.
- Estado: Zustand (un store por feature en `src/store`, sin un store global).
- Datos: SQLite on-device vía `expo-sqlite` + Drizzle ORM. Sin backend — todo el plan
  Free es local-first (ver sección "Modelo de datos").
- Gestos/animación: `react-native-gesture-handler` + `react-native-reanimated` 4.x
  (requiere `react-native-worklets` como dependencia explícita — ver Gotchas).
- Hápticos: `expo-haptics` (agregado 2026-08-28 con el rediseño del onboarding —
  `impactAsync`/`selectionAsync` al cambiar de slide; requirió `expo prebuild
  --clean` + rebuild).
- `lottie-react-native` (agregado 2026-08-28, dep nativa) — **instalado pero SIN
  USO todavía**, reservado para animaciones pre-horneadas del onboarding (p. ej.
  un confeti de cierre). Si sigue sin usarse mucho tiempo, evaluar sacarlo.
- Audio: `expo-audio` (grabación y reproducción reales, no mocks).
- Dictado por voz: `expo-speech-recognition` (agregado 2026-08-26 — dependencia
  nativa de terceros, no un módulo de Expo; requirió `expo prebuild --clean` +
  rebuild nativo, ver `src/hooks/useVoiceDictation.ts`). Distinto de
  `expo-audio`: acá el resultado es TEXTO reconocido en vivo (reemplaza el
  título de Quick Add/`ItemDetailSheet`), no un archivo de audio grabado.
- Filesystem: `expo-file-system` (API nueva `File`/`Directory`/`Paths`, no la
  legacy) — borrar el archivo físico de audio de una nota de voz, y copiar los
  assets de ejemplo (`assets/seed/`) a `documentDirectory` en el seed
  (`copySync` + `expo-asset`).
- Íconos: `lucide-react-native` + `react-native-svg` — **no `@expo/vector-icons`/
  `MaterialIcons` directo**, ver "Sistema visual".
- Fuentes: Plus Jakarta Sans + JetBrains Mono (`@expo-google-fonts/*`), cargadas en
  `app/_layout.tsx`.

## Cómo correr la app

Usar el skill de proyecto `.claude/skills/run-on-device/SKILL.md` — cubre Metro,
compilar el APK debug e instalarlo por USB, con todas las trampas del entorno ya
resueltas (puerto ocupado, adb, babel). No reinventar este flujo desde cero.

### Build variants: dev / test / prod

Patrón portado de `my-wallet-app`/`habit-tracker` (repos hermanos). Config dinámica en
`app.config.ts` (no `app.json` estático, que fue eliminado) — una tabla `variants` define
`name`/`package`/`scheme` por variant (el ícono es IDÉNTICO en los 3 desde
2026-09-23 — ya no hay `iconBackground` por variant, ver "Logo y splash screen"), seleccionado con la env var
`APP_VARIANT` (`dev` por defecto si no se define). Un `APP_VARIANT` desconocido **lanza
excepción** al resolver la config, no hay fallback silencioso.

| Variant | `applicationId` | Para qué | Cómo se construye |
|---|---|---|---|
| `dev` | `app.meld.mobile` | Iterar día a día, Metro + hot reload | Local, `npm run build:dev` (`assembleDebug`) |
| `test` | `app.meld.mobile.test` | Probar un build "limpio" sin Metro, sin cable | Local, `npm run build:test` (`assembleRelease`) |
| `prod` | `app.meld` | La versión final para las stores | Solo EAS, `npm run eas:prod` — nunca local |

Los IDs de paquete eran `app.anchor.*` hasta el rebranding a Trove (2026-08-21), y
`app.trove.*` hasta el rebranding a Meld (2026-08-27) — cada migración se hizo a
propósito, sabiendo que eso reinstala como app nueva en cualquier dispositivo con la
versión vieja instalada. Tras el rename a Meld se corrió `expo prebuild --platform
android --clean` para regenerar `android/` con el `applicationId` nuevo (no alcanza con
editar `app.config.ts` solo — el proyecto nativo generado ya tenía el paquete viejo
horneado).

Los tres se instalan **uno al lado del otro** en el mismo dispositivo (`applicationId`
distinto = apps distintas para Android), cada una con su propia base de datos SQLite. El
código de la app lee el variant desde `src/constants/appVariant.ts`
(`appVariant`/`isDev`/`isTest`/`isProd`), nunca desde `process.env` directo (esa env var
solo existe en el proceso de build de Node, no en runtime de la app).

```bash
npm run build:dev     # prebuild (incremental si no cambió el variant) + assembleDebug + adb install
npm run build:test    # ídem con assembleRelease
npm run eas:prod      # AAB/APK firmado con credenciales gestionadas por EAS, en la nube
```

`scripts/build-android.sh` (usado por `build:dev`/`build:test`) recuerda el último variant
construido en `android/.last-variant` — solo fuerza `prebuild --clean` cuando el variant
cambió (cambiar de variant obliga a un rebuild nativo completo porque el `applicationId`
queda horneado en el proyecto nativo generado); reconstruir el mismo variant corre un
`prebuild` incremental para no perder las cachés de Gradle. Si hay un dispositivo conectado
(`adb get-state` responde), instala automáticamente; si no, deja el APK listo en
`android/app/build/outputs/apk/...` para transferirlo manualmente — sin necesidad de
mantener el cable/depuración USB activos (el pedido original de este patrón).

`prod` se rechaza explícitamente en local (`scripts/build-android.sh prod` sale con error):
un `assembleRelease` local firmaría con la debug keystore y dispararía el bloqueo de Google
Play Protect. `eas build --profile prod` resuelve esto de raíz: EAS genera y gestiona una
keystore de producción real por su cuenta.

**EAS ya está vinculado (2026-09-02)**: `app.config.ts` → `extra.eas.projectId`
(`0bdd091e-25d8-4d30-9f44-94544b38c6ea`, proyecto creado en expo.dev por el
usuario). Se agregó `extra.eas` a mano porque `app.config.ts` es dinámico y
`eas init` no lo puede escribir solo. Scripts: `npm run eas:test`
(`APP_VARIANT=test eas build --profile test --platform android`, distribución
interna → link + QR para compartir, firmado por EAS así que Play Protect no lo
bloquea) y `npm run eas:prod`. **Falta todavía** `eas login` + `npm i -g eas-cli`
en la máquina del usuario (interactivo, lo corre él) — no ejecutar `eas build` sin
que lo pida.

## Arquitectura de carpetas

```
/app                    → rutas (Expo Router). Grupo (tabs) sin tab bar nativa real:
                           la navegación es un menú que se expande inline dentro
                           de `FloatingBar` (☰), no Tabs de Expo Router — ver
                           "Navegación" abajo.
/src
  /domain                → tipos y lógica pura, sin dependencias de RN
    dayItem.ts            → DayItem y subtipos (el modelo central, ver abajo)
    date.ts, time.ts       → helpers de fecha/hora (todo en minutos-desde-medianoche
                              o "HH:MM" 24h para persistir; formato humano solo al
                              renderizar)
    week.ts                → semana ISO-8601 (Calendar vista Semana, `habit.ts` —
                              `getWeekRange`/`getISOWeek`; `recentWeeks` quedó sin
                              uso tras el rework de Moments a por-día)
    calendarGrid.ts,
    calendarHeatmap.ts     → grilla de mes / heatmap de año (Calendar) — el heatmap
                              alinea el día 1 a su columna real de semana (offset
                              lunes-primero, mismo cálculo que `calendarGrid.ts`)
    quickAdd.ts             → constantes y helpers compartidos entre Quick Add y el
                              detalle de ítem (listas de presets, conversión
                              label↔hora, frecuencia de hábito, `PRIORITY_COLOR`)
    voiceParser.ts          → `parseVoiceInput(raw, lang)` — parser offline
                              es+en de una frase dictada/escrita → `VoicePrefill`
                              (tipo/título/día/hora/prioridad/categoría/
                              repetición) para pre-llenar Quick Add. Ver
                              "Agregar por voz / texto"
    habit.ts                → recurrencia/progreso/racha real de hábitos
                              (`isHabitScheduledOn`, `computeWeekProgress`,
                              `computeStreak`, `computeHeatmapDotState`) — ver
                              "Hábitos recurrentes y tracking real"
    healthMetrics.ts         → catálogo de métricas de Auto-registro
                              (Steps/Sleep/Rings/Workouts, `HEALTH_METRIC_OPTIONS`)
                              — ver "Auto-registro real"
    iconNames.ts             → union `IconName` (nombres semánticos de ícono, p.ej.
                              `'delete-outline'`) — vive en domain (no en
                              components) para que archivos puros como
                              `quickAdd.ts` y los mappers de `features/*` puedan
                              tipar su campo `icon` sin importar la capa de
                              componentes; `components/Icon.tsx` es quien mapea
                              cada nombre al ícono Lucide real
  /data/local
    schema.ts               → tabla Drizzle `day_items` (una tabla ancha, columnas
                              nullable por tipo — no hay tablas separadas por tipo)
                              + `habit_completions` (un registro por día que un
                              hábito se marcó hecho, ver "Hábitos recurrentes")
    db.ts                   → init (CREATE TABLE) e instancia de Drizzle
    dayItemRepository.ts    → única puerta de entrada a SQLite (listByDate,
                              listByDateRange, listInbox, upsert, remove,
                              searchByTitle, listUpcomingReminders,
                              listDistinctHabitTitles, listActiveHabits,
                              toggleHabitCompletion, listHabitCompletionDates,
                              listAllHabitCompletionsInRange)
    seed.ts                 → datos de ejemplo, solo se insertan si `day_items`
                              está vacía Y el variant es `dev` (`TodayScreen.tsx`
                              gatea `seedIfEmpty()` con `isDev` de
                              `constants/appVariant.ts`, agregado 2026-08-27) —
                              `test`/`prod` instalan 100% vacíos, sin ítems de
                              ejemplo, para que un build "limpio" (`npm run
                              build:test`) realmente lo sea (bug real reportado: el
                              primer build de test tras el rename a Meld seguía
                              trayendo la data de muestra de Stitch). **Ampliado
                              2026-08-28** para sacar screenshots representativos de
                              los mockups del onboarding: siembra los 6 tipos de
                              ítem (tareas con hora/campana/prioridad/categoría, 2
                              hechas, eventos, nota, notas de voz reproducibles,
                              hábitos manuales + de salud), historial real de
                              `habit_completions` (rachas/progreso calculados de
                              verdad), Momentos con foto, e ítems repartidos por
                              todo el mes actual para la vista Calendario. Las
                              fotos (4) y clips de audio silencioso (2) viven en
                              `assets/seed/` y se copian a `documentDirectory` en
                              el primer arranque vía `expo-asset` +
                              `expo-file-system` (API nueva `File`/`Directory`/
                              `Paths`, `copySync`) — sin eso una nota de voz con
                              `audioFileUri` vacío muestra "Audio eliminado" y un
                              Momento sin `mediaUri` real no renderiza.
                              `targetFrequency` de los hábitos usa los valores
                              canónicos en inglés (`'Every day'`/`'Weekdays'`/
                              `'3x a week'`/`'Weekly'`, ver `HABIT_SCHEDULE_OPTIONS`),
                              no strings sueltos. **Ampliado 2026-09-16** con 2
                              tareas con `date` en el pasado (`status:
                              'scheduled'`) para poder ver el rollover de
                              tareas atrasadas (ver "Interacciones no obvias")
                              apenas se abre la app con datos nuevos.
  /constants
    appVariant.ts             → variant de build (dev/test/prod) leído en runtime
                              vía `expo-constants` — ver "Build variants" arriba
  /features/<pantalla>     → una carpeta por pantalla: Screen.tsx + mappers
                              domain→viewmodel específicos de esa pantalla
    calendar/calendarView.ts → tipo `CalendarView` ('week'|'month'|'year')
                              compartido entre CalendarScreen y CalendarViewSwitch
    calendar/useWeekAgenda.ts → estado + mutaciones (toggle/delete/clear audio) de
                              la vista Semana — separado de la UI para que el
                              selector de días (sticky, en el header fijo) y la
                              lista (dentro del ScrollView) compartan los mismos
                              datos sin duplicar el fetch
  /components               → design system compartido, agrupado por área
                              (quickAdd/, itemDetail/, dayItem/, calendar/,
                              moments/, settings/, timePicker/, datePicker/,
                              durationPicker/, habitAutoTrack/)
    Icon.tsx                 → único punto de entrada a íconos — ver "Sistema visual"
    ScreenHeader.tsx           → fila de encabezado compartida por Today/Calendar/
                              Inbox/Settings (`TopAppBar` la usa internamente para
                              Today). Título y `right` (botones/switch) van en la
                              MISMA fila con `alignItems:'center'`; el subtítulo va
                              debajo, a todo el ancho, sin participar de esa
                              alineación — antes cada pantalla armaba su propio
                              `View` ad-hoc (paddingTop distinto, Inbox con
                              `alignItems:'flex-end'`) y el header "saltaba" de
                              posición al cambiar de pestaña, y los botones
                              quedaban más abajo que el título por el `lineHeight`
                              extra del título grande (34/40) si se alineaba el
                              bloque título+subtítulo completo contra ellos.
    EmptyState.tsx             → estado vacío compartido (ícono flotante con
                              animación sutil de vaivén + título + mensaje
                              contextual) — usado en Today ("Nada agendado para
                              hoy"), Inbox ("Tu Bandeja de entrada está vacía")
                              y Moments (sin fotos; ahí SIN botón CTA, la fila
                              "Hoy" con el "+" va arriba del EmptyState). Se renderiza
                              dentro de un contenedor con `flex:1`/`flexGrow:1`
                              para quedar centrado en toda el área visible de la
                              pantalla (no solo pegado arriba) — al agregarlo a
                              una lista nueva, dar `flexGrow:1` al
                              `contentContainerStyle` del `ScrollView` padre.
    ListSkeleton.tsx          → maquetación gris pulsante que llena la pantalla
                              mientras carga una lista — evita el parpadeo del
                              estado vacío antes de que lleguen los datos.
                              `variant: 'rows'|'tiles'` (`rows` = Today/Inbox/
                              agenda Semana; `tiles` = Momentos). Calcula la
                              cantidad de filas con `useWindowDimensions` para
                              rebasar el borde inferior (no un número fijo, que
                              daría a entender "hay justo N ítems"). Wireado en
                              Today (`dayItemsStore.loading` init `true`),
                              `InboxScreen` (`inboxStore.loading` init `true`),
                              agenda Semana de Calendar (`useWeekAgenda` expone
                              `loading`) y `MomentsScreen` (state local). Solo
                              aparece en carga real "sin nada todavía" — los
                              stores/hooks conservan datos entre navegaciones.
                              Ver "Interacciones no obvias" → "Skeleton de carga".
    ConfirmDialog.tsx         → modal de confirmación propio del design system
                              (reemplaza `Alert.alert` nativo para acciones
                              destructivas — usado por `SwipeToDeleteCard`)
    dayItem/SwipeToDeleteCard.tsx → deslizar una fila a la izquierda revela un
                              botón de eliminar a la derecha (Today/Inbox); si se
                              pasa `onScheduleToday`, deslizar a la DERECHA revela
                              un botón verde "Hoy" (solo Inbox) — ver
                              "Interacciones no obvias". El callback de swipe
                              derecho se dispara desde el worklet del gesto, por
                              eso pasa por `runOnJS` — llamarlo directo revienta
                              la app con un error de Reanimated en silencio hasta
                              que se prueba en dispositivo real. El fondo con el
                              botón de basura/"Hoy" es un hermano ABSOLUTO de la
                              fila animada (no un recorte de ella) — su opacidad
                              está atada con `interpolate` al progreso real del
                              swipe (`translateX`), no a un simple `opacity: 1`
                              fijo; sin eso, el fondo rojo se ve un frame de más
                              al remontar filas rápido (p. ej. pasar de día en día
                              con las flechas del `DayBar`), porque la card
                              animada (`flex:1`) tarda un frame en recibir su
                              layout real y por un instante no la cubre (bug real
                              ya corregido, no reintroducirlo si se toca este
                              componente).
    calendar/CalendarViewSwitch.tsx → switch de 3 íconos (Mes/Semana/Año),
                              usado en el header de Calendar entre 2026-08-2x
                              y 2026-08-26 — YA NO SE USA, revertido a pedido
                              explícito del usuario para calzar con el mock de
                              Pen "Calendar Screen" (que usa texto, no
                              íconos). El archivo queda en el repo sin uso por
                              si se quiere retomar, pero `CalendarScreen.tsx`
                              hoy usa `components/SegmentedToggle.tsx` (el
                              genérico de texto, ver "Interacciones no
                              obvias" → nota sobre navegación de mes)
    calendar/CalendarFilterBar.tsx,
    calendar/CalendarFilterSheet.tsx → pill flotante sobre `FloatingBar` +
                              hoja de selección única (Todo/Tasks/Events/Notes/
                              Voice notes/Moments/un ítem por hábito existente) —
                              ver "Interacciones no obvias"
    calendar/WeekDaySelector.tsx → fila de 7 días (L M M J V S D) con el día
                              seleccionado en `accent` y un punto si ese día tiene
                              ítems — vive en el header FIJO de Calendar (fuera del
                              ScrollView) para quedar sticky al hacer scroll
    quickAdd/TimeFieldRow.tsx → fila que abre `timePicker/TimePickerModal`
                              (wheel-picker de hora/minuto + AM/PM) — reemplaza el
                              ciclo de presets para campos que son una hora real
                              del día
    quickAdd/DateFieldRow.tsx → fila que abre `datePicker/DatePickerModal`
                              (calendario de mes, reutiliza `calendarGrid.ts`) —
                              reemplaza el ciclo Inbox/Hoy/Mañana
  /store                    → un store Zustand por responsabilidad (día actual,
                              inbox, quick add, detalle de ítem, arrastre de hora,
                              menú de navegación, settings, búsqueda, recordatorios
                              próximos, filtro de Calendario, `addMenuStore` =
                              speed-dial del FAB, `voiceAddStore` = pantalla de
                              dictado). `quickAddStore` tiene `prefill` +
                              `openWithPrefill()` para el flujo de voz/texto.
  /theme                    → tokens.ts (paleta, tipografía, `typeColors`,
                              `categoryColors`) + ThemeProvider
  /i18n                      → traducciones es/en — ver "Idioma" abajo
  /hooks, /services          → integraciones nativas (audio, picker de fotos,
                              notificaciones locales — `services/notifications.ts`)
```

## Idioma (es/en)

App bilingüe, español por defecto. `src/i18n/translations.ts` tiene los
diccionarios `es`/`en` (mismas claves, TypeScript rompe si falta una) más
`WEEKDAY_SHORT`/`MONTH_SHORT`/`MONTH_FULL` por idioma. `src/i18n/index.ts`
expone `useTranslation()` (`{ t, lang }`, reactivo) y `translate(lang, key)`
para código fuera de React (p. ej. `services/notifications.ts`). El idioma
vive en `settingsStore.language` (persistido), con selector en Settings
(`cycleLanguage`).

- **Domain (`date.ts`, `week.ts`, `calendarHeatmap.ts`, `quickAdd.ts`) es
  pure — no usa hooks.** Reciben `lang: Language` como parámetro (default
  `'es'`) en vez de leer el store directo. Cualquier función nueva que
  formatee fecha/mes/semana en un archivo de dominio necesita el mismo
  patrón: parámetro `lang`, no importar React.
- **Los valores internos de los presets de Quick Add/ItemDetail
  (`HABIT_SCHEDULE_OPTIONS`, `EARLY_ALERT_OPTIONS`, etc. — los que quedan como
  `PresetFieldRow`, ver "Sistema visual") están SIEMPRE en inglés** — son el
  estado real que se persiste (`repeatRule`) o que
  parsean `labelToHour24`/`earlyAlertToMinutes`/
  `frequencyTarget`. Lo que se traduce es solo la etiqueta visible, vía
  `presetLabel(value, lang)` (tabla en `domain/quickAdd.ts`). Mismo patrón
  para categorías: `QUICK_ADD_CATEGORIES[i].label` es el valor canónico que
  se guarda en `DayItem.category`, `labelKey` es la traducción a mostrar.
  **No traducir los arrays de opciones directamente** — rompe el ciclo de
  presets y la persistencia de ítems ya guardados.
- Pendiente/no cubierto todavía: formato de hora AM/PM
  (`domain/time.ts` → `minutesToLabel`) sigue en inglés siempre; el
  contenido sembrado por `seed.ts` es data de ejemplo, no chrome de UI, y
  queda en inglés a propósito (fiel a los mocks originales).
- **El español de `translations.ts` es neutro/latinoamericano, sin voseo** —
  el usuario corrigió explícitamente "Elegí"→"Elige", "Habilitalo"→"Actívalo",
  "Intentá"→"Inténtalo". Al escribir un string nuevo en `es`, usar la forma
  "tú" (imperativo "-a"/"-e", nunca "-á"/"-í" de voseo argentino).

## Modelo de datos

`DayItem` (`src/domain/dayItem.ts`) es una unión discriminada por `type`: `task`,
`event`, `habit`, `note`, `voiceMemo`, `moment`. Todos comparten `DayItemBase`
(incluye `priority`, que es de todos los tipos, no solo de Task — así lo pidió el
usuario para que Quick Add lo muestre siempre).

Reglas importantes:
- `date: string | null` — null significa que el ítem vive en el Inbox (sin agendar).
- `reminderAt: string | null` — datetime ISO completo. El sentinel de hora
  `ANY_TIME_HHMM` (`domain/time.ts`, hoy `"24:00"`) significa "recordatorio sin
  hora específica" (se renderiza con el ícono de campana, "Any Time"); `null`
  significa sin recordatorio (se renderiza con guion "—"). Este doble sentinel
  es la pieza más sutil del modelo — no simplificarlo sin revisar
  `mapDayItemToRow.ts` y `ItemDetailSheet.tsx`. **Es "24:00" y no "00:00" a
  propósito**: el wheel-picker de hora nunca puede producir 24:00 (cubre
  00:00–23:59), así que no colisiona con una medianoche real — antes usaba
  "00:00" y un recordatorio puesto deliberadamente a las 12:00 AM se
  interpretaba como "Any Time" y nunca disparaba su notificación (bug real ya
  corregido, no reintroducir el sentinel viejo). En memoria (Quick Add/
  ItemDetailSheet, antes de convertirse a `reminderAt`), el equivalente es
  `ANY_TIME_MINUTES` (`-1`) — ver "Interacciones no obvias" → "Cualquier
  hora" para el flujo completo de UI.
- La capa SQL (`schema.ts`/`dayItemRepository.ts`) es una tabla ancha con columnas
  nullable por tipo. Al agregar un campo nuevo a un subtipo, tocar: `dayItem.ts`
  (dominio), `schema.ts` (columna), `db.ts` (CREATE TABLE), `dayItemRepository.ts`
  (toDomain/toRow). Ej. `Event.link` (2026-08-31) reusó la columna `link` que ya
  existía para `Task` — solo hubo que sumarlo a `dayItem.ts` y al `case 'event'`
  de `toRow` (`toDomain` ya lo spreadea).
- **`reminderAt` con hora específica dispara una notificación local real**, no solo
  el ícono de campana. `services/notifications.ts` (`syncReminderNotification`)
  programa/reprograma una notificación de `expo-notifications` para esa hora
  exacta; el sentinel `ANY_TIME_HHMM` (Any Time) no programa nada, solo es visual. Ojo
  con el sufijo `"Z"` de `reminderAt`: es un artefacto de formato (HH:MM siempre es
  hora LOCAL, nunca UTC) — `notifications.ts` arma el `Date` a mano por eso, nunca
  usar `new Date(reminderAt)` directo. `syncReminderNotification` se llama desde
  los tres lugares donde se puede fijar "Recordarme"/hora: `timeDragStore.confirm()`
  (gesto de arrastrar), `QuickAddSheet.handleSave` e `ItemDetailSheet.handleSave`
  — los tres reprograman al guardar.
- **Notificaciones: preferencia local vs. permiso del SO**. Dos cosas
  separadas, a propósito — mismo patrón que `notificationsEnabled` en
  "my-wallet-app" (`app/settings.tsx` → `handleBudgetAlertToggle` /
  `src/services/notificationService.ts`):
  - **Permiso real del SO** (`getNotificationPermissionStatus`/
    `requestNotificationPermission` en `services/notifications.ts`) — lo
    controla Android/iOS, la app no puede revocarlo por su cuenta. El pedido
    del permiso ahora vive SOLO en el paso final del onboarding
    (`NotificationsStep`, botón "Activar recordatorios" →
    `requestNotificationPermission()`), con contexto. **`primeNotificationPermissionOnLaunch()`
    (el prompt silencioso al arrancar) SE ELIMINÓ de `RootStack` el
    2026-08-28** — la función sigue exportada en `services/notifications.ts`
    por si se necesita, pero no la llama nadie. Si el usuario salta el paso o
    toca "Ahora no", no se vuelve a pedir hasta que intente fijar un
    recordatorio real.
  - **`settingsStore.notificationsEnabled`** — preferencia LOCAL de la app
    (persistida), el toggle real de "Notificaciones" en `SettingsScreen`.
    **Apagarlo es instantáneo y 100% local — nunca abre Ajustes del sistema
    ni toca el permiso real** (corregido: la primera versión de este toggle
    SIEMPRE redirigía a Ajustes del sistema para "apagar", una UX confusa que
    el usuario pidió explícitamente sacar, viendo cómo lo resuelve
    my-wallet-app). `syncReminderNotification` chequea este flag primero y no
    programa nada si está en `false`, sin importar que el permiso del SO
    siga concedido. Prenderlo sí intenta el diálogo nativo
    (`requestNotificationPermission`) y recién ahí, si `canAskAgain` es
    `false` (rechazo permanente, sin más diálogo posible), abre
    `Linking.openSettings()` — el único caso realmente sin salida dentro de
    la app. `SettingsScreen` refresca `canAskAgain` en cada foco
    (`useFocusEffect`) por si el usuario vuelve de Ajustes del sistema
    habiendo cambiado algo a mano, pero eso NUNCA fuerza el valor del toggle
    — el toggle vale lo que diga `notificationsEnabled`, punto.
- **Doze mode**: `app.config.ts` declara el permiso Android `SCHEDULE_EXACT_ALARM`
  — sin él, `expo-notifications` cae a `AlarmManagerCompat.setAndAllowWhileIdle`
  (alarma NO exacta) en vez de `setExactAndAllowWhileIdle`, y Doze puede
  demorar un recordatorio con hora puntual varios minutos u horas (la lógica
  de fallback ya vive adentro de `expo-notifications`, ver
  `ExpoSchedulingDelegate.kt` — `alarmManager.canScheduleExactAlarms()` decide
  cuál de las dos usar; el permiso declarado es lo único que faltaba de este
  lado). No hay detección/aviso si el usuario lo revoca a mano — eso exigiría
  un módulo nativo chico (Expo Modules API) para exponer
  `canScheduleExactAlarms()` a JS, que no existe todavía; evaluado y
  descartado por ahora a favor de la ganancia más simple (declarar el
  permiso, que Android otorga solo en la mayoría de los casos).

### Hábitos recurrentes y tracking real (agregado 2026-08-20)

Antes de esto, una Habit era una fila más de `day_items` con una sola `date`
fija (igual que una Task) — no recurría a otros días, y `progress`/
`currentStreak` eran texto estático que se escribía una vez al crear el
hábito y nunca se volvía a actualizar. Tocar la fila en Today solo abría el
detalle; no había forma de marcar "ya lo hice hoy". El toggle "Hábitos en
Hoy" de Ajustes (`settingsStore.habitsInTodayEnabled`) existía pero no
estaba conectado a nada. Todo esto se resolvió a pedido explícito del
usuario:

- **`habit_completions`** (`data/local/schema.ts`/`db.ts`): tabla nueva,
  un registro por día que un hábito se marcó hecho (`habitId`, `date`,
  índice único sobre ambos). Es la ÚNICA fuente de verdad de completado real
  — las columnas `progress`/`current_streak` de `day_items` quedan como
  snapshot inicial al crear el hábito (para que Quick Add tenga algo que
  mostrar antes del primer `reload`), pero no se leen para mostrar el
  conteo/racha real en ningún lado.
- **`domain/habit.ts`** (dominio puro, sin DB): `isHabitScheduledOn(schedule,
  date)` decide si un hábito corresponde ese día ("Weekdays" salta
  sábado/domingo; el resto de frecuencias se ofrece todos los días — el
  usuario elige en qué días completar el objetivo semanal, no hay día fijo
  asignado). `computeWeekProgress`/`computeStreak` calculan "x/y" y racha a
  partir de un `Set` de fechas completadas — la racha tiene dos modos: diaria
  (Every day/Weekdays, días programados consecutivos) o semanal (3x a
  week/Weekly, semanas consecutivas donde se llegó al target); en ambos
  casos, si el período actual (día/semana) todavía no se completó, NO cuenta
  como racha rota — arranca a contar desde el período anterior, porque
  todavía se puede completar.
- **`dayItemRepository`**: `listActiveHabits()` trae TODOS los hábitos
  ignorando su columna `date` (que en un hábito ahora es solo "fecha de
  creación", no "el único día que vive") — excluye `status: 'inbox'` (el
  único camino a eso es vaciar el campo Fecha compartido de
  `ItemDetailSheet`, que también aplica a Habit). `toggleHabitCompletion`/
  `listHabitCompletionDates`/`listAllHabitCompletionsInRange` operan sobre
  `habit_completions`.
- **`dayItemsStore`**: `reload()` ahora, además de `listByDate`, trae
  ocurrencias recurrentes de hábitos programados para `selectedDateKey` (si
  `habitsInTodayEnabled`, finalmente conectado) con `progress`/
  `currentStreak` recalculados en memoria (no se reescriben en la DB) y un
  `habitCompletedMap: Record<habitId, boolean>` con si ya se marcó hecho ESE
  día. `toggleHabitComplete(id)` alterna el registro en `habit_completions`
  para `selectedDateKey` y recalcula progress/streak — sin snackbar de
  Deshacer (es un toggle, tocarlo de nuevo ya es el "deshacer"). El contador
  "X de Y hechos" de `DayBar` lee `habitCompletedMap` para hábitos en vez de
  `status` (un hábito nunca cambia `status` al completarse).
  **Rendimiento (2026-09-16, bug real reportado — "se siente muy lento" al
  cambiar de día con swipe/flechas/"Volver a hoy"):** `loadHabitOccurrences`
  consultaba `listHabitCompletionDates` de cada hábito programado con un
  `for...await` SECUENCIAL — con N hábitos eran N viajes a SQLite en fila,
  en cada `reload()`. Se cambió a `Promise.all` (las consultas son
  independientes entre sí, no hay motivo real para encadenarlas). El
  `reload()` de más arriba (`listByDate`/hábitos/`listOverdueTasks`)
  también pasó de 3 `await` en fila a un solo `Promise.all`. Si se agrega
  OTRA consulta a `reload()` en el futuro, sumarla ahí adentro — no
  `await`earla suelta antes o después del `Promise.all`, se vuelve a
  reintroducir el mismo cuello de botella.
- **UI**: `DayItemRow` tiene un `Leading` nuevo, `habitIcon` (reemplaza a
  `icon`/el viejo `ringIcon` — ya eliminado — SOLO para hábitos; `icon` sigue
  existiendo tal cual para Event/Note/VoiceMemo, no tocable), tocable vía
  `onToggleHabitComplete` con el mismo patrón de Pressable anidado que ya
  usaba el checkbox de Task. `TodayItemRow` recibe `habitCompletedToday`/
  `onToggleHabitComplete` como props opcionales (no reventar si falta —
  `WeekAgendaView` sigue usando `TodayItemRow` sin pasarlos, ver limitación
  de alcance arriba). **`habitIcon` acepta un `healthIcon?: IconName`
  opcional que se dibuja como un ícono chico APARTE, justo después del
  cuadro de completar — nunca en su lugar** (corregido 2026-08-20: la
  primera versión reemplazaba el ícono genérico del cuadro por el de la
  métrica, lo que además hacía parecer "ya completado" a simple vista
  incluso sin estarlo — el usuario lo marcó explícitamente con una captura
  de referencia mostrando ambos íconos lado a lado). El viejo `ringIcon`/
  `habitRing` (con un anillo decorativo estático) se sacó del todo — no
  aparecía en ninguna referencia real, era una suposición de una sesión
  anterior; no reintroducirlo.
- **Heatmap real** (`domain/calendarHeatmap.ts` + `domain/habit.ts` →
  `computeHeatmapDotState`): `buildMonthHeatmap` ya NO genera el estado del
  día con un hash — recibe un callback `dayState(dateKey, date)` que
  `CalendarScreen` arma a partir de `listActiveHabits()` +
  `listHabitCompletionDates` en rango (todo el año). `'green'` = todos los
  hábitos programados ese día se completaron, `'red'` = al menos uno no,
  `'none'` = ningún hábito programado ese día. Si el filtro de Calendario
  (`calendarFilterStore`) es un hábito específico, agrega solo ESE hábito;
  si es "Todo" o un tipo no-hábito, agrega entre TODOS los hábitos — por eso
  un mismo día puede verse rojo en la vista sin filtrar (un hábito
  incompleto) y verde al filtrar por otro hábito que sí se completó ese día.

### Auto-registro real (picker de métricas de salud, agregado 2026-08-20)

Antes, "Auto-registro" era un ciclo de 2 valores (`AUTO_TRACK_OPTIONS`,
`Off`/`Apple Health`, ya eliminado) que en la práctica solo guardaba
`healthMetric: 'steps'` hardcodeado — nunca se pudo elegir una métrica real
ni un objetivo numérico. Se reemplazó por un modal fiel a un picker de
referencia estilo Apple Health que el usuario pasó (capturas de un video):

- **`domain/healthMetrics.ts`**: `HEALTH_METRIC_OPTIONS`, 15 métricas en 3
  grupos (`activity`: Steps/Exercise minutes/Active energy/Sleep, cada una
  con `defaultTarget`/`unitKey`/`step` para el stepper; `rings`: Move/
  Exercise/Stand ring closed + All three rings; `workouts`: Any workout/
  Running/Walking/Cycling/Strength training/Swimming/Yoga) — solo las 4 de
  `activity` tienen objetivo numérico ajustable, Rings/Workouts son
  binarios. `id` es el valor interno (inglés, se persiste tal cual en
  `Habit.healthMetric`), `labelKey` es lo único traducido — mismo criterio
  que `REPEAT_OPTIONS`/`HABIT_SCHEDULE_OPTIONS`.
- **Columna nueva `health_metric_target`** (`day_items`, real, nullable) —
  como la tabla ya existía instalada en dispositivos de sesiones previas,
  `db.ts` la agrega con un `ALTER TABLE` envuelto en try/catch (SQLite no
  soporta `ADD COLUMN IF NOT EXISTS`; el catch absorbe "duplicate column
  name" en arranques donde ya corrió antes) — replicar este patrón si se
  agrega OTRA columna a una tabla que ya tenía usuarios, el
  `CREATE TABLE IF NOT EXISTS` de arriba NO alcanza para eso.
- **`components/habitAutoTrack/AutoTrackModal.tsx`**: hoja modal (no el
  picker compacto tipo `WheelTimePicker` — es una lista larga, necesita el
  patrón de bottom-sheet scrollable de `QuickAddSheet`) con "None" (con
  ícono `check` — "marcá este hábito vos mismo") + las 3 secciones. Tocar
  una métrica de Actividad muestra un stepper +/- inline en ESA fila
  (`option.step`, mínimo `option.step` para no bajar a 0/negativo); el
  resto de filas solo muestran un check de seleccionado. Incluye
  `autoTrackProNote` (texto fijo bajo el título, `i18n/translations.ts`):
  **"con el plan Pro, al conectar Apple Health o Google Fit este check se
  marca solo apenas cumplas la meta ahí; por ahora, márcalo a mano"** — ESTA
  es la anotación completa de la función de plan Pro que pidió el usuario
  (dónde vive: este texto visible + el comentario largo sobre
  `Habit.autoTrack` en `domain/dayItem.ts` + la sección dedicada
  "## Roadmap Pro", más abajo en este archivo, que junta TODO lo pendiente
  de plan Pro en un solo lugar) — nota explícita de producto, NO una feature
  implementada todavía; el tap manual (`onToggleHabitComplete`) sigue
  funcionando igual para hábitos con Auto-registro y seguiría funcionando
  igual el día que se implemente Health real (el check manual siempre
  puede corregir lo que diga Health).
- **`components/quickAdd/HealthAutoTrackFieldRow.tsx`**: fila que abre el
  modal, usada en `QuickAddSheet`/`ItemDetailSheet` en vez del viejo
  `PresetFieldRow`. **Elegir cualquier métrica (no "None") es lo que
  convierte el hábito en "de salud" al guardar** — `colorStyle: 'cool'`,
  `autoTrack: true`, en vez de tener que elegirlo por separado; es
  literalmente la "segunda forma de crear un hábito" que pidió el usuario,
  unificada en el mismo formulario (no un flujo/TypeTabs aparte).
- **Ícono según la métrica, aparte del check** (`mapDayItemToRow.ts` →
  `leadingFor` construye `healthIcon` buscando en `HEALTH_METRIC_OPTIONS` por
  `item.healthMetric`, solo para hábitos `colorStyle: 'cool'` — undefined si
  no matchea nada, footprints para Steps, bed para Sleep, dumbbell para
  Strength training, etc.): se dibuja SIEMPRE junto al cuadro de completar,
  nunca en su lugar (ver nota de `habitIcon`/`healthIcon` más arriba).
- **Orden en Today**: `mapDayItemToRow.ts` → `sortWithHealthHabitsLast`
  (aplicado en `TodayScreen.tsx` sobre `visibleRows`) manda los hábitos
  `colorStyle: 'cool'` al final de la lista, sin importar su hora — fiel a
  la referencia del usuario (Strength Training/10K Steps/Watch Rings/7hr
  sleep agrupados abajo del todo). Sort estable: el resto de ítems conserva
  su orden relativo. Esto NO aplica a la agenda Semana de Calendar
  (`WeekAgendaView` no usa `sortWithHealthHabitsLast`) — mismo alcance
  acotado a Today que el resto de la feature de hábitos.
- **Marcar CUALQUIER hábito (manual o "de salud") lo saca de la lista de
  Today** (agregado 2026-08-20 para hábitos "de salud", extendido a todos los
  hábitos el 2026-08-25 a pedido explícito — antes los manuales quedaban
  visibles marcados, a propósito; el usuario pidió unificar el comportamiento
  con Task), mismo patrón que Task — `TodayScreen.tsx` → `visibleRows` filtra
  `habitCompletedMap[id]` sin distinguir `colorStyle`, con snackbar de
  Deshacer (`dayItemsStore.toggleHabitComplete`, texto `habitCompleted`) igual
  que `toggleComplete` de Task — sin esto, marcar y esconder sin salida rápida
  sería una trampa de UX. El registro sigue intacto en `habit_completions` de
  cualquier forma (se borra al deshacer, no al ocultarse) y el heatmap de Año
  lo sigue contando esté o no visible en Today — marcar/ocultar es puramente
  de renderizado, la fuente de verdad para Calendar nunca se toca. La
  recurrencia (`isHabitScheduledOn`) es lo que lo vuelve a traer al día
  siguiente si corresponde — no hace falta lógica extra para eso, ya existía.

### Categorías configurables (agregado 2026-09-11)

Antes, "Categoría" era una lista fija de 3 (Work/Personal/Health,
`QUICK_ADD_CATEGORIES` en `domain/quickAdd.ts`) sin ícono, sin poder
crear/renombrar/eliminar. A pedido explícito del usuario ("agregar una
sesión en Ajustes donde pueda configurar las categorías"), ahora son
totalmente editables — decisión tomada con `AskUserQuestion`: pantalla
dedicada (no un popup) con gestión completa, SIN drill-down a la lista de
ítems de cada categoría (eso ya se puede hacer filtrando en Calendario).

- **Tabla `categories`** (`data/local/schema.ts`/`db.ts`): `id`/`label`/
  `icon`/`color`/`sort_order`. Sembrada UNA sola vez si está vacía (primer
  arranque) con las 3 categorías de siempre (`cat-work`/`cat-personal`/
  `cat-health`) — a partir de ahí son filas normales, editables/borrables
  como cualquier otra. `QUICK_ADD_CATEGORIES` sigue existiendo en
  `quickAdd.ts` pero SOLO como default de esa siembra y fallback de palabras
  clave de `voiceParser.ts` — `CategoryChips` ya NO lee de ahí.
- **`category`/`categoryColor` en `day_items` siguen siendo texto copiado al
  crear el ítem, NO una referencia real a `categories`** (mismo patrón que el
  título de un hábito) — a propósito, para no complicar el modelo. Consecuencia
  documentada: renombrar/recolorear una categoría NO actualiza
  retroactivamente los ítems que ya la usan, y borrarla los deja con ese
  texto "huérfano" (sigue mostrándose igual, solo deja de estar disponible
  para elegir en ítems nuevos).
- **`store/categoriesStore.ts`**: `categories` + `usage` (por categoría,
  `{pending, total}` — cuenta ítems con esa categoría agrupando en memoria
  desde `dayItemRepository.listCategoryUsage()`, no un `GROUP BY` en SQL).
  Se carga una vez al arrancar la app (`_layout.tsx`, junto a `initDb()`) y
  cada vez que se abre la pantalla de gestión.
- **`components/settings/CategoriesManagerSheet.tsx`** (Modal a pantalla
  completa, `animationType="slide"`, store propio `categoriesSheetStore`):
  lista con ícono+color+nombre+badge de conteo (número de pendientes, o
  "Completado" si `total>0 && pending===0`, o nada si `total===0`). Fila
  "Categorías" nueva en Ajustes → sección General abre esta hoja.
  `CategoryFormModal.tsx` (crear/editar, Modal-sobre-Modal apilado — mismo
  patrón que `DatePickerModal` dentro de `QuickAddSheet`) con grid de
  íconos (`CATEGORY_ICON_OPTIONS`, 16 opciones) y grid de colores
  (`CATEGORY_COLOR_PALETTE`, 8 swatches fijos — mismo criterio que
  `accentPalette` de `theme/tokens.ts`, no un color picker libre). Eliminar
  pasa por `ConfirmDialog` (primer uso real de ese componente en la app —
  hasta ahora existía en el design system pero ningún componente lo usaba,
  ver "Eliminar un ítem (swipe)" más abajo).
- **`CategoryChips` (Quick Add/`ItemDetailSheet`) lee del store dinámico**, ya
  no de la lista estática — `cat.label` se muestra directo (sin `t()`, no
  tiene sentido traducir un nombre que el usuario tipeó; distinto de
  `PRIORITY_OPTIONS`/`HABIT_SCHEDULE_OPTIONS`, que siguen usando
  `labelKey` porque sus valores son fijos, no datos del usuario).

## Sistema visual

Dark-first, fiel pixel a pixel a mocks HTML/Tailwind generados en Stitch que el
usuario fue pasando pantalla por pantalla. Los tokens de color están en
`src/theme/tokens.ts` — cualquier color nuevo debe salir de esos tokens (`bg`,
`surface`, `surfaceLow`, `surfaceHigh`, `pillSolid`, `border`), nunca hardcodear un
hex nuevo sin chequear que combine. El paso previo con tinte rojizo/beige heredado
del mock Material original ya se corrigió (paleta clara actual: `bg`/`surface`
blancos puros, `surfaceLow`/`surfaceHigh`/`pillSolid`/`border` en gris neutro, sin
sesgo cálido) — si algo nuevo vuelve a verse beige/marrón, es una regresión de
esto, no una variación de diseño válida.
- **En modo claro, el fondo de pantalla (`bg`) y las tarjetas/hojas elevadas
  (`surface`) son el MISMO blanco puro** — la separación visual entre "fondo de
  pantalla" y "fila de ítem" la da `surfaceLow` (gris neutro), no `surface`.
  `DayItemRow`/`InboxItemRow` usan `surfaceLow` como fondo de card a propósito;
  no volver a poner `palette.surface` ahí o las filas se vuelven invisibles sobre
  el fondo blanco. Mismo problema, otra causa, ya corregido en
  `components/settings/SettingsSection.tsx`: su card SÍ usa `palette.surface` a
  propósito (fondo blanco de una card elevada, no una fila de lista), pero
  como `surface === bg` en claro necesita `borderWidth: 1, borderColor:
  palette.border` para no volverse invisible contra el fondo — sin ese borde,
  cada grupo de Ajustes (General/Conexiones/Apariencia) se veía como líneas
  sueltas en vez de una card agrupada. `components/settings/SettingRow.tsx`
  tenía el mismo problema en su divisor interno entre filas
  (`borderBottomColor` hardcodeado en un gris oscuro fijo, pensado solo para
  fondo oscuro) — ahora usa `palette.border`, coherente con el borde exterior
  de la card en ambos modos.
- **El título grande (34px, `font.extrabold`) de todo header de pantalla
  (`TopAppBar`, y los headers ad-hoc de Settings/Moments/Inbox) lleva
  `lineHeight: 46` explícito.** Sin esto, la fuente (Plus Jakarta Sans
  ExtraBold) deja un leading grande debajo del glifo que separaba demasiado el
  subtítulo del título — comparado contra una captura de referencia, el hueco
  título→subtítulo era ~3x más grande que el de la referencia. **Ojo: no bajar
  de 46** — un primer intento con `lineHeight: 36` (y después `40`) volvía a
  separar bien el subtítulo, pero recortaba el descendente de glifos como la
  "y" de "Hoy" (se veía con la cola cortada en línea recta en vez de la curva
  completa, bug real reportado por el usuario con captura, 2026-09-16); `46` es
  el valor mínimo que no vuelve a cortar el glifo Y sigue dejando el hueco
  ajustado. Si se agrega un header nuevo con este mismo patrón de título
  grande, replicar `lineHeight: 46` (no un valor más chico "porque se ve
  ajustado en el simulador/una captura" — confirmar siempre con una palabra
  real con descendentes, tipo "Hoy"/"Ajustes"). El subtítulo (15px,
  `font.regular`) debajo también necesita su propio `lineHeight: 20` explícito
  por el mismo motivo (recorte de glifos altos sin él, mismo bug, mismo día).
- **Today YA NO tiene fondo con degradado — `palette.bg` plano, igual que el
  resto de pantallas** (cambiado 2026-08-27, a pedido explícito del
  usuario: primero se le cambió el color del glow de teal/cian a un coral
  claro tirando al acento de la marca, y en el siguiente pedido se sacó del
  todo). `components/AuraBackground.tsx` (`variant="abyssal-floor"`/
  `"nightfall"`, aproximación liviana con `react-native-svg`
  `RadialGradient` + `expo-linear-gradient`) **sigue en el repo sin uso** —
  `TodayScreen.tsx` ya no importa el componente ni le pasa la prop
  `background` a `Screen`. Si se pide reactivarlo, el componente todavía
  tiene ambas variantes completas (con el color coral ya aplicado a
  `abyssal-floor`, no el teal/cian original) — solo hace falta volver a
  importarlo y pasarlo por `background={scheme === 'dark' ? <AuraBackground
  /> : undefined}`. Se probaron y **descartaron del todo** (antes de sacar
  el fondo entero) otras 5 variantes en vivo en Today (Aurora Beams, Smoke,
  Carbon Glass, Phantom Arc, Dew) — no reintroducirlas sin que las vuelvan
  a pedir explícitamente.

Convenciones de UI ya establecidas — reusar, no reinventar:
- Selección activa de cualquier control (chip, tab, prioridad) usa
  `palette.accent`, nunca un color propio del dato (ver bug corregido de
  categoría en Quick Add).
- **Íconos: siempre `<Icon name="..." />` de `components/Icon.tsx`, nunca
  `MaterialIcons`/`@expo/vector-icons` directo.** La app migró completa a
  `lucide-react-native` (a pedido del usuario, "íconos más profesionales"); `Icon`
  mantiene los mismos nombres semánticos que antes tenía `MaterialIcons` (p. ej.
  `name="check"`, `name="delete-outline"`) mapeados internamente al componente
  Lucide real, así el resto del código no depende de la librería concreta. El tipo
  `IconName` (unión cerrada de esos nombres) vive en `domain/iconNames.ts`, no en
  `Icon.tsx` — si se agrega un ícono nuevo, agregar el nombre ahí primero y
  después el mapeo en `Icon.tsx`. `lucide-react-native` necesita
  `react-native-svg` como dependencia nativa — agregar un ícono que no está en el
  mapa actual no requiere rebuild nativo (ya está el módulo), pero si algún día se
  reinstala `react-native-svg` sí hace falta `expo prebuild` + reinstalar el APK.
- `FieldRow` (icono + etiqueta + valor) es el bloque base de toda fila de
  configuración en Quick Add / `ItemDetailSheet`. Encima de `FieldRow` hay tres
  patrones de interacción según el tipo de dato:
  - `PresetFieldRow` — acordeón inline (lista de presets fijos que se expande
    debajo de la fila) para campos que NO son una hora real (Repetir, Duración,
    Alerta previa, Hora preferida de hábito, Auto-track).
  - `TimeFieldRow` — abre `timePicker/TimePickerModal` (wheel-picker libre de
    hora/minuto + AM/PM) para campos que sí son una hora real del día (Recordarme
    en los 4 tipos que lo tienen, Empieza de Event). Ya no existe un campo "Hora"
    separado en Task — se eliminó a pedido del usuario porque duplicaba lo que ya
    resuelve "Recordarme" (ver "Interacciones no obvias").
  - `DateFieldRow` — abre `datePicker/DatePickerModal` (calendario de mes
    completo + chips rápidos) para el campo Fecha/Día. Los chips rápidos son
    únicamente "Hoy" (y "Bandeja" cuando aplica) — **no agregar un chip
    "Mañana"**, se sacó a propósito porque el calendario ya cubre cualquier día.
- **Quick Add/ItemDetailSheet son UNA sola card (`configBox`) por sección de
  campos, no varias cards separadas** — decisión explícita del usuario tras
  probar la alternativa de dos cards con borde propio (una para los campos del
  tipo, otra para Categoría/Prioridad): la prefirió como una sola superficie
  continua, separada solo por líneas divisorias internas (mismo patrón que
  `FieldRow`/`SettingRow`). La línea entre el bloque de campos del tipo y
  Categoría es el borde inferior del ÚLTIMO `FieldRow`/`PresetFieldRow`/
  `TimeFieldRow` de ese bloque (con `showBorder` en su valor por defecto
  `true` — no pasarle `showBorder={false}` como se hacía antes, o la línea
  desaparece). La línea entre Categoría y Prioridad es la prop `showBorder` de
  `CategoryChips` (`components/quickAdd/CategoryChips.tsx`) — agrega
  `borderBottomWidth`/`paddingBottom` propios al contenedor, ausentes por
  default porque `CategoryChips` se usa en más de un lugar y no todos quieren
  el divisor.
- **Categoría y Prioridad son acordeones colapsados por default** (agregado
  2026-08-26, a pedido explícito — antes mostraban los chips/tabs siempre
  visibles, ocupando espacio permanente en Quick Add/`ItemDetailSheet` para
  algo que se usa poco). `CategoryChips.tsx`/`PriorityTabs.tsx` ahora tienen
  su propio `expanded` (estado local, mismo patrón que
  `PresetFieldRow` — acordeón inline, no un modal aparte): el header (ícono +
  etiqueta) se volvió una fila tocable que muestra el valor actual (la
  categoría/prioridad elegida, sin nada si Categoría no tiene ninguna —
  Prioridad siempre tiene un valor porque "Ninguna" es una opción real) +
  chevron `chevron-down`/`chevron-up`, y los chips/tabs solo se renderizan
  cuando `expanded` es `true`. El divisor entre Categoría y Prioridad vive en
  UN solo lugar (el header cuando está colapsado, o al pie de los chips
  cuando está expandido) — nunca en los dos a la vez, o el espacio se ve
  doble (bug real ya corregido). **Categoría/Prioridad ahora viven DENTRO del
  mismo `fieldGroup` (`gap:0`) que los campos específicos del tipo
  (Recordarme/Repetir/etc.), no en un `fieldGroup` propio separado** — bug
  real ya corregido: `configBox` tiene `gap:24` entre cada hijo directo, así
  que dos `fieldGroup` distintos (uno para los campos del tipo, otro para
  Categoría+Prioridad) generaban un salto de 24px ahí en medio que no existía
  entre el resto de los campos (que sí comparten un solo `fieldGroup`); ahora
  es un ÚNICO `fieldGroup` con TODO adentro (campos del tipo + Categoría +
  Prioridad), sin ningún salto interno — coherente con "una sola card, solo
  líneas divisorias" (ver el bullet de arriba sobre `configBox`). La API
  pública de ambos componentes (props `value`/`onChange`/`showBorder`) no
  cambió, así que `ItemDetailSheet` heredó el comportamiento nuevo sin
  tocarlo — si se agrega un campo similar en el futuro, seguir este mismo
  patrón de acordeón DENTRO del `fieldGroup` existente, no en uno aparte.
  **La transición de expandir/colapsar** (agregado el mismo día, a pedido
  explícito — antes aparecía/desaparecía de golpe) vive en
  `components/quickAdd/accordionMotion.ts` (`ACCORDION_LAYOUT`/
  `ACCORDION_ENTER`/`ACCORDION_EXIT`, Reanimated `LinearTransition`/`FadeIn`/
  `FadeOut` — mismo mecanismo que ya usa el resto de la app, p. ej.
  `TodayScreen.ROW_TRANSITION`), compartida por `PresetFieldRow`,
  `CategoryChips` y `PriorityTabs`. Si se agrega OTRO acordeón inline en el
  futuro, importar estas mismas constantes en vez de definir duraciones
  nuevas sueltas.
- **Dictado por voz en el campo de título** (`src/hooks/useVoiceDictation.ts`,
  agregado 2026-08-26 a pedido explícito, `expo-speech-recognition` — ver
  Stack): botón de micrófono en la esquina inferior derecha del cuadro de
  título de Quick Add/`ItemDetailSheet` (el cuadro se hizo más alto,
  `minHeight`/`paddingBottom` extra, para que el ícono no tape el texto).
  Reconoce en el idioma actual de la app (`lang === 'es' ? 'es-ES' :
  'en-US'`), `interimResults: true` + `continuous: false` — el resultado
  reemplaza el título EN VIVO mientras se habla y la escucha se corta sola al
  terminar la frase (no hay que tocar de nuevo para parar, aunque tocar el
  mic mientras escucha también lo corta manualmente). Pide permiso de
  micrófono/reconocimiento la primera vez
  (`ExpoSpeechRecognitionModule.requestPermissionsAsync()`) — si no se
  concede, no hace nada (sin mensaje de error todavía). Distinto del ícono de
  micrófono de `VoiceRecordRow` (tipo Nota de voz): ese graba audio crudo con
  `useVoiceRecorder`/`expo-audio`, este transcribe a texto y no genera ningún
  archivo.
- **Cada opción de `PriorityTabs` tiene su propio color de bandera**
  (`PRIORITY_OPTIONS` en `domain/quickAdd.ts` — Ninguna gris `#8E8E93`, Baja
  azul `#4F9DDE`, Media ámbar `#F2A93B`, Alta rojo `#E5484D`, mismo patrón que
  los colores fijos de `QUICK_ADD_CATEGORIES`). El ícono `flag` de cada pill
  usa ese color cuando NO está seleccionada; al seleccionarla, el ícono pasa a
  blanco sobre el fondo `palette.accent` — **la selección activa sigue usando
  el acento del tema, nunca el color propio de la prioridad**, seguir la
  misma regla que ya existía para la selección de categoría (ver más abajo,
  "Selección activa de cualquier control").
- `FloatingBar` es el esqueleto compartido de toda barra flotante inferior
  (Today/Calendar/Inbox/Moments/Settings) — no crear una barra nueva desde cero.
  **Rediseño 2026-08-27, a pedido explícito con referencia visual (menú, pill
  de fecha y FAB como 3 piezas sueltas con hueco entre ellas)**: reemplaza a la
  versión anterior de una sola card continua con las 3 cosas adentro — decisión
  que en su momento fue explícita en sentido contrario, revertida ahora con una
  nueva referencia. Menú (círculo) y FAB (círculo) son `Pressable` propios,
  siempre en la misma posición fija (`sideSlot`, alto `FLOATING_BAR_HEIGHT`,
  alineados al fondo del row con `alignItems:'flex-end'`) — nunca se mueven ni
  se agrandan. Desde 2026-08-29 la fila `row` (menú/pill/FAB) tampoco cambia de
  alto: la fila extra (Confirmar hora / Deshacer / Volver a hoy) es una card
  aparte ARRIBA de `row`, no dentro de `centerColumn` (ver abajo).
  - **Idle** (sin arrastre de hora, sin Undo visible, sin `topRow`): NO hay
    ningún `View` contenedor con fondo propio — el `center` que pasa cada
    pantalla (el pill en sí) flota solo, directo. Bug real corregido acá: la
    primera versión SÍ envolvía `center` en una card con su propio fondo
    (`palette.surface`) + padding, y como `DayBar`/`Inbox` ya dibujan su
    propio pill con fondo (`palette.pillSolid`) adentro, se veía un pill
    oscuro "encajonado" dentro de otro pill más grande y de otro tono — un
    doble recuadro no pedido. Por eso **todas** las pantallas que usan
    `FloatingBar` necesitan que su `center` traiga su PROPIO fondo (`palette
    .pillSolid`, altura 48, mismo `borderRadius` que su `barRadius`) — antes
    Calendar/Moments/Settings dependían del fondo de la card exterior (que ya
    no existe en idle), ahora lo declaran ellos mismos en su propio `.pill`.
  - **Con fila extra** (arrastre de hora, Undo visible, o `topRow` como
    "Volver a hoy" de `DayBar`): la fila extra
    (`TimeConfirmRow`/`UndoRow`/`topRow`) es una **card flotante SEPARADA por
    encima de toda la barra** (a todo el ancho del `row`, con fondo
    `palette.surface` + sombra propios y un hueco `FLOATING_BAR_ROW_GAP` = 10
    px debajo), NO pegada al pill ni estirando el `centerColumn` (cambiado
    2026-08-29 a pedido explícito — antes era una sola card continua
    fila+pill). El pill central sigue flotando solo, igual que en idle.
    `TimeDragOverlay`/`CalendarFilterBar` ya suman
    `FLOATING_BAR_CONFIRM_ROW_HEIGHT + FLOATING_BAR_ROW_GAP` cuando hay
    arrastre/Undo, así que el gap más grande queda cubierto sin tocarlos.
  - Ninguna de las 3 piezas (menú/pill central/FAB) tiene borde (`borderWidth`)
    — solo sombra (`shadowColor`/`elevation`) para separarse del fondo, a
    pedido explícito tras verse un contorno no deseado alrededor del pill.
  - **Forma unificada en las 5 pantallas, sin excepción** (mismo pedido
    explícito, con la referencia visual de Calendar como "la correcta" a
    replicar en todas): menú y FAB son SIEMPRE círculos perfectos —
    `circleBtn` (menú) usa un `borderRadius` fijo (26, mitad de su tamaño
    fijo 52) que no depende de `barRadius`; el FAB usa `borderRadius:
    fabSize / 2` inline, así que un círculo perfecto sin importar qué
    `fabSize` le pase cada pantalla — **hoy las 5 usan el mismo `fabSize`
    default (56)**, sin overrides (Inbox/Settings tenían `fabSize={48}`,
    se sacó a pedido explícito para que el tamaño también fuera idéntico en
    las 5, no solo la forma). El pill central es una cápsula (`borderRadius: 24` con
    `height: 48`) en las 5 pantallas por igual — `DayBar` (Today),
    `InboxScreen`, `CalendarScreen`, `MomentsScreen` y `SettingsScreen`
    tienen todos el mismo par altura/radio en su `.pill`/`pager`. El default
    de `barRadius` (usado solo por la card de la fila extra, ver arriba)
    también se subió a 24 para que esa card combine con el mismo lenguaje
    de cápsula — ya no hace falta que ninguna pantalla lo pase explícito
    (se sacó `barRadius={24}` de Calendar/Settings, quedaba redundante).
- Acciones destructivas (eliminar un ítem) usan `ConfirmDialog`
  (`components/ConfirmDialog.tsx`), nunca `Alert.alert` nativo — el modal propio
  respeta paleta/tipografía del design system en claro y oscuro.
- **`palette.danger` (botón de basura del swipe-to-delete) es un rojo clásico
  saturado — `#E5484D` en dark, `#d9294a` en light** (`theme/tokens.ts`;
  cambiado 2026-08-26 a pedido explícito). Antes, en dark, era `#ffb4ab` (el
  rojo desaturado tipo Material 3 para fondos oscuros) — a simple vista se
  confundía con el coral del `accent`/FAB por ser un tono similar, aunque son
  tokens distintos. Si se vuelve a ver "rosado" en vez de rojo, es este token
  el que hay que revisar, no el `accent`.
- **Cluster derecho de `DayItemRow` = lista ordenada de badges + una acción,
  no un solo `Trailing`** (rediseño 2026-08-31, a pedido explícito con
  referencia visual — "controlar qué sale en la tarjeta para que no sature").
  `DayItemRow.tsx` → `type TrailingBadge` (unión: `priority` | `recurrence` |
  `subtasks` (RESERVADO, sin modelo aún) | `habitProgress` | `streak` |
  `favorite` | `category`). `mapDayItemToRow.ts` → `trailingBadgesFor()` los
  emite YA ordenados por precedencia y recortados a `MAX_TRAILING_BADGES` (2):
  **prioridad (media/alta) › subtareas › recurrencia › progreso/❤ de hábito ›
  racha › categoría** — la categoría es la primera en caerse si hay más de dos.
  La ACCIÓN (reproducir audio / abrir link) va aparte, SIEMPRE se muestra, no
  cuenta contra el tope — `DayItemRow` recibe `playback`/`audioDeletedLabel`/
  `hasLink` como props separadas de `trailing` (antes playback venía embutido
  en `trailing`). Detalles por badge:
  - **Categoría**: `category`/`categoryColor` VOLVIÓ a la fila (revirtió la nota
    vieja de "ya no se muestra") pero COMPACTA — punto de color + primera
    palabra recortada a ~12 chars (`shortCategory`). La etiqueta completa sigue
    en `ItemDetailSheet`.
  - **Prioridad**: bandera de color SOLO si es media o alta (`PRIORITY_COLOR`,
    exportado de `domain/quickAdd.ts`); baja y "ninguna" no muestran nada.
  - **Recurrencia**: ícono `repeat` cuando una `task` tiene `repeatRule`.
  - **Racha** (`streak`, Capa 1 del pedido de rachas 2026-08-31): `🔥 N` para
    hábitos con `currentStreak >= 2` ("🔥 1" es ruido). Color `STREAK_COLOR`
    (`#F59E0B`, local a `DayItemRow` — no mezclar con `accent` ni con el ámbar
    de prioridad). `currentStreak` viene recalculado en memoria por
    `dayItemsStore.reload` en Today; en la agenda Semana de Calendar puede ser
    el snapshot de la DB (misma limitación que `progress`). Capa 2 (mini-stats
    en el detalle del hábito) y Capa 3 (tira de la semana) quedaron para cuando
    haya una pantalla de Hábitos dedicada.
  - Ícono `checklist` (Lucide `ListChecks`) agregado a `Icon.tsx`/`iconNames.ts`
    RESERVADO para el badge de subtareas — el modelo de subtareas todavía no
    existe.
- **Puntos del grid de Mes (Calendario) = color por TIPO, no por categoría**
  (2026-09-02). `theme/tokens.ts` → `typeColors` (fijo, independiente del
  acento y del tema): tarea azul `#3B82F6`, evento rojo `#EF4444`, hábito verde
  `#22C55E`, nota amarillo `#EAB308`, audio morado `#8B5CF6`, momento naranja
  `#F97316`. `MonthDayCell.tsx` usa `typeColors[item.type]` (antes
  `categoryColor ?? accent`, que hacía casi todos los puntos del mismo color).
  SOLO el grid de Mes — la vista **Año** NO se tocó (sigue el heatmap verde/
  rojo de adherencia a hábitos, que es su propósito; decisión explícita).
- **Los acordeones inline se colapsan al elegir un valor** — `PresetFieldRow`
  ya lo hacía; `CategoryChips` y `PriorityTabs` se sumaron el 2026-09-02
  (`setExpanded(false)` en el `onPress` del chip/tab, animación `ACCORDION_EXIT`
  que ya tenían). Si se agrega otro acordeón de selección, seguir el patrón.

## Logo y splash screen

Rebranding Anchor → Trove (2026-08-21) → Meld (2026-08-27, ver más arriba). El logo
(`assets/logo.png`, copiado también a `icon.png`/`android-icon-foreground.png`/
`splash-icon.png` — las 4 son el mismo archivo, no hay symlink) sigue en iteración —
un círculo con un checkmark integrado en su propio contorno, degradado blanco→coral
`#FF4B66`. Todavía tiene pendiente el mismo problema que otras direcciones
descartadas antes de llegar a esta (ver historial completo en memoria de sesión, no
en este archivo): el fondo del archivo fuente sale blanco en vez de negro sólido, y
el check es un trazo superpuesto en vez de estar recortado del propio círculo — no
darlo por definitivo sin confirmar con el usuario. El wordmark de texto (splash,
ver abajo) ya dice "Meld" — el logo en sí (la forma del ícono) no depende del nombre
y no necesitó cambios por el rename.

**Ícono del launcher (2026-09-23, a pedido explícito: "el logo como tal, sin
cambiarle nada de fondo")**: antes el adaptive icon usaba `logo.png` entero como
foreground (con su margen blanco) sobre un `backgroundColor` distinto por
variant — se veía el cuadrado negro encajonado en un borde de color. Ahora las
capas salen de `logo.png` recortado: `android-icon-background.png` = el
degradado negro del cuadrado del logo (full-bleed), `android-icon-foreground.png`
= el círculo coral con el check dentro de la zona segura (72/108), mismo
tamaño relativo que en el logo; `android-icon-monochrome.png` = círculo sólido
con el check calado (íconos temáticos); `icon.png` (iOS/legacy) = cuadrado
completo sin márgenes. Los 3 variants se ven iguales (se distinguen por el
nombre "(Dev)"/"(Test)"). `logo.png`/`splash-icon.png` NO se tocaron.

**Contador de pendientes sobre el ícono (badge, 2026-09-23)**:
`services/appBadge.ts` → `refreshAppBadge()` fija
`Notifications.setBadgeCountAsync(n)` con n = tareas de hoy sin completar +
atrasadas del rollover (mismo criterio que Today). Se llama desde
`refreshWidgets()` (hereda TODOS los puntos de mutación), desde el headless
task del widget (así se pone al día cada 30 min con la app cerrada, p. ej. al
cambiar de día) y al volver la app a primer plano (`AppState`, en
`app/_layout.tsx`). Android lo hace vía ShortcutBadger (dentro de
`expo-notifications`): solo lo muestran launchers con badges numéricos
(Samsung One UI sí; Pixel/Moto solo pintan un punto por notificaciones y lo
ignoran — no es un bug del código). iOS requiere el permiso de notificaciones.

### Splash animado (`src/components/AnimatedSplash.tsx`)

Reemplaza al splash nativo estático (mismo logo/fondo, configurado en
`app.config.ts` → plugin `expo-splash-screen`) apenas React puede pintar.
Coreografía: ícono con rebote sutil de escala, glow ambiental (`RadialGradient`
real de `react-native-svg`, mismo patrón que `AuraBackground.tsx`) pulsando
detrás, wordmark "Meld" y lema ("Todo tu día. Una sola app.", clave `appTagline`
en `i18n/translations.ts`) entrando en cascada — y como salida, el MISMO nodo del
glow (no uno duplicado) se expande con `Easing.in` hasta cubrir toda la pantalla
mientras el resto se apaga, y ahí corta directo a Today. Total ~1.9s.

Se armó primero un mock de referencia en pen.dev (`designs/trove-splash.pen` — ver
"pen.dev Design" en las skills disponibles para cómo generar/editar diseños ahí)
antes de llevarlo al código real. **El CLI de pen requiere Node ≥22** (el proyecto
usa Node 20) — correr `nvm use 22` antes de `pen interactive` en este entorno, o
falla en silencio con errores de QuickJS poco claros. **`pen interactive` no
persiste nada hasta que se llama `save()` explícito dentro de la MISMA sesión** —
si se abre una invocación nueva sin haber guardado la anterior, los cambios previos
se pierden sin aviso (pasó real varias veces en esta sesión); encadenar varios
`execute()` + `save()` final dentro del mismo heredoc/proceso, nunca separarlos en
invocaciones distintas si dependen de ids creados antes. **El archivo está
enlazado a un proyecto en la nube (`fileToken` propio dentro del `.pen`) — el
navegador del usuario en pen.dev muestra ESE mismo proyecto**, así que lanzar
varias invocaciones de `pen interactive` SEGUIDAS y muy rápido contra el mismo
archivo puede pisarse entre sí (carrera con la sincronización a la nube: una
sesión nueva a veces carga un estado más viejo del que la anterior recién
terminó de guardar, y el `save()` de la sesión nueva termina revirtiendo el
progreso — pasó real esta sesión, el `save()` reportaba éxito pero el archivo
en disco/nube quedaba con el contenido de ANTES). Mitigación: hacer TODOS los
cambios de una tanda en una sola sesión/heredoc con un solo `save()` final (ya
era la regla), y si hace falta lanzar una sesión de verificación aparte
después de guardar, no asumir que salió bien solo por el mensaje "Saved" —
releer el nodo modificado desde una sesión (headless) nueva y separada antes
de darlo por bueno, y si se sospecha una carrera, esperar unos segundos entre
el `save()` de una sesión y el `--in` de la siguiente.

`trove-splash.pen` ya tiene dos componentes reutilizables (`reusable:true`) además
de "Sheet": **`ScreenHeader`** (título + subtítulo + slot de íconos a la derecha —
usado por instancia `ref` en el header de "Empty State / No Tasks Today" y de
"Today / Viewing Another Day") y **`FloatingBar`** (nodo `Fjw31`, usado por las 5
pantallas con barra flotante). Al agregar una pantalla nueva al mock, preferir
instanciar estos dos componentes (`type:"ref"` + `descendants` para overrides) en
vez de reconstruir header/barra desde cero.

**`FloatingBar` del mock actualizado 2026-08-27** para que sea fiel al rediseño
real del componente (`components/FloatingBar.tsx`, ver "Interacciones no obvias" →
"Eliminar un ítem (swipe)" y el resto de menciones a `FloatingBar` más abajo): ya
NO es una sola card (`fill`/`cornerRadius`/`stroke`/sombra en la raíz) con "Top
Row" + divisor + "Bar Row" (menú/pill/FAB) adentro — ahora la raíz es una fila
transparente (`gap:10`, `alignItems:"end"`) con 3 hijos sueltos: **Menu Button**
(círculo 52×52, antes "Menu Slot" sin fondo propio), **Center Column** (columna
que agrupa "Top Row" + "Pager Pill", cada una su propia cápsula de altura 48/radio
24 con sombra y sin borde) y **FAB** (círculo 56×56, antes radio 16). Se eliminó
el nodo "Top Divider" (ya no aplica sin card continua) y el contenedor "Bar Row"
(innecesario, sus 3 hijos ahora cuelgan directo de la raíz/Center Column). Las 5
instancias (`bGYka` Calendar, `g3ltL`/`nIAkZ`/`HKsVB` los 3 Empty State, `qiP4R`
Today/Viewing Another Day) heredan el cambio sin tocarse — solo `qiP4R` seguía
necesitando su override de `AlMqF.enabled:true` (Top Row visible), se le quitó
la referencia muerta a `glw9h` (el divisor borrado).

**Este archivo se editó DIRECTO como JSON (Python), no vía el CLI `pen`** — ver
[[feedback-pen-json-direct]] en memoria: el `execute`/MCP de pen.dev estuvo
completamente caído en la sesión (`IPCError: Lifetime not alive`, un problema
más severo que la carrera de sincronización de más arriba — acá NINGUNA llamada
a `execute` funcionaba, ni siquiera un `Print(1)`). El agente de `pen` igual
reportaba "listo" con un resumen detallado, pero el archivo en disco quedaba con
el contenido VIEJO sin cambios reales — pasó dos veces en la misma sesión
(acá y en `task-detail-sheet.pen`, que quedó pendiente de reintentar). Desde
entonces, la regla para cualquier `.pen` es: leer/editar el JSON directo
(Python/Edit), revalidar releyendo la estructura, y NO invocar el CLI salvo que
haga falta una captura renderizada real (con el riesgo explicado en memoria).
**Síntoma relacionado**: si la app de escritorio de Pen "no abre" o queda
trabada, sospechar el mismo IPC roto — buscar procesos colgados
(`ps aux | grep squashfs-root/pen`, quedan corriendo desde sesiones viejas) y
matarlos (`pkill -f "squashfs-root/pen"`) antes de reabrirla; pasó real esta
sesión y resolvió el problema.

**Cuatro bugs reales encontrados en dispositivo durante esta sesión, todos ya
corregidos — no reintroducirlos:**

1. **El glow como color plano con `opacity` en vez de gradiente real** se veía
   como un disco duro/gigante desproporcionado, no un resplandor — hay que usar
   `RadialGradient` de `react-native-svg` con stops desvaneciendo a transparente,
   igual que `AuraBackground.tsx`. Un color plano con opacidad baja sobre el fondo
   oscuro tampoco sirve para "aclarar" un color — lo oscurece hacia un marrón
   apagado en vez de aclararlo (blend real sobre negro, no es lo mismo que sobre
   blanco); para que algo se vea "claro" hace falta un tinte claro en sí mismo,
   no bajar la opacidad de un color saturado.
2. **`AnimatedSplash` como overlay `position:absolute` encima de `RootStack`**
   (dos árboles montados a la vez) no cubría la pantalla de forma confiable — el
   glow quedaba flotando sobre Today en vez de taparlo. Se resolvió con un patrón
   secuencial: un solo árbol de CONTENIDO a la vez (`introDone` state en
   `app/_layout.tsx`), pero `GestureHandlerRootView`/`SafeAreaProvider` montados
   SIEMPRE una sola vez arriba — el `Svg` del glow necesita el mounting manager
   de Fabric ya inicializado por esos providers para pintar props (sin ellos
   queda mudo: Reanimated sigue corriendo del lado JS pero nada llega a la vista
   nativa — mensaje real en logcat:
   `RetryableMountingLayerException: Unable to find SurfaceMountingManager`,
   junto con eventos `topSvgLayout` descartados por `instanceHandle is null`).
3. **El ícono se veía "dos veces" al abrir la app**: la primera versión hacía
   fundido de opacidad 0→1 en el ícono al montar — esa fracción de segundo en la
   que el ícono de React se solapaba semitransparente sobre el splash NATIVO
   estático (mismo ícono, ya visible de antes) se leía como dos íconos
   superpuestos. Fix: `logoOpacity` arranca fijo en `1` (nunca anima al montar,
   solo al final para la salida) — la única señal de "aparición" es un rebote de
   escala (1 → 1.08 → 1), nunca un fundido de opacidad en el ícono mientras
   pueda solaparse con el nativo.
4. **El ícono "subía" al aparecer el wordmark/lema**: aunque esos textos
   arrancan en `opacity:0`, seguían ocupando espacio real en el layout (hijos
   del mismo contenedor flex centrado que el ícono) — el `justifyContent:
   'center'` corría al ícono hacia arriba para dejarles lugar debajo, un desfase
   de posición contra el splash nativo (que centra el ícono en TODA la pantalla,
   sin nada más) que se leía como si apareciera un segundo ícono en otro lugar.
   Fix: `iconWrap` y el bloque de texto son dos `View` `position:absolute`
   independientes, cada uno anclado por separado al centro real de la pantalla
   — el ícono nunca se mueve al aparecer/desaparecer el texto.

**`SplashScreen.hideAsync()` se llama directo en un `useEffect` de
`app/_layout.tsx`** (patrón de `my-wallet-app`, repo hermano — ver su
`src/components/ui/AnimatedSplash.tsx`/`app/_layout.tsx` si hace falta
referencia), NO detrás de un evento `onLayout` — depender de `onLayout` de
`SafeAreaProvider` llegó a tardar 27s en dispositivo real en una sesión de
pruebas larga (posible degradación del propio dispositivo tras muchos
relanzamientos seguidos, no reproducido en frío) — sin esa indirección, oculta
el splash nativo apenas se puede pintar, sin depender de que un evento de
layout dispare a tiempo.

`imageWidth` del plugin `expo-splash-screen` en `app.config.ts` DEBE coincidir
con el `width`/`height` del ícono en `AnimatedSplash.tsx` (`ICON_SIZE`, hoy 160)
— un tamaño distinto entre el ícono nativo estático y el animado se ve como un
salto de tamaño en el handoff, contribuía también a la sensación de "doble
ícono" del bug #3.

## Navegación

No hay tab bar nativa persistente. Cada pantalla tiene su propia barra flotante
(`FloatingBar`/`DayBar`) con un botón "☰". El layout de `(tabs)/_layout.tsx` es un
`Stack` sin header, no un `Tabs` — si se reintroduce `Tabs` de Expo Router, se
vuelve a duplicar la navegación (ya pasó una vez, el usuario lo marcó como bug).

**El menú de navegación se expande INLINE dentro de la propia `FloatingBar`, no
en un modal aparte** (rediseñado 2026-09-04, a pedido explícito — antes tocar "☰"
abría `NavigateMenu`, un popup con backdrop oscurecido flotando sobre toda la
pantalla; ese componente se eliminó del todo). Ahora, tocar "☰" (controlado por
`navigateMenuStore`, mismo store de siempre — `open`/`close`/`visible`, solo
cambió cómo se consume) oculta el pill central y el FAB "+" y los reemplaza, en
el mismo lugar, por una fila con los 5 destinos (`NAV_DESTINATIONS` en
`FloatingBar.tsx`, antes vivía en el `NavigateMenu.tsx` ya borrado) — el ícono
del botón pasa a "×" para cerrar. Transición compartida con los acordeones de
Quick Add (`ACCORDION_LAYOUT`/`ACCORDION_ENTER`/`ACCORDION_EXIT` de
`accordionMotion.ts`): el FAB se desvanece/reaparece con fade, y el ancho se
reacomoda con `LinearTransition` cuando desaparece. Mientras el menú está
expandido se suprime la fila extra de Confirmar hora/Deshacer/Volver a hoy (ver
más abajo) para no superponerse. Orden de destinos (`NAV_DESTINATIONS`), a
pedido explícito del usuario: **Hoy, Bandeja, Calendario, Momentos, Ajustes** —
no es alfabético ni el orden en que se construyeron las pantallas, no
"corregirlo" a otro orden sin que se pida.

**Header de Today** (`TopAppBar.tsx`): buscar + toggle de agrupar + "más"
(`more-horiz`). Era solo 2 (buscar + más, 2026-08-25, calcado del mock "Empty
State / No Tasks Today"); el 2026-09-01 se agregó el **tercer ícono**
(`filter-list`) a pedido explícito — alterna la lista de Today entre plana y
**agrupada por tipo** (ver "Vista agrupada de Today" en Interacciones no
obvias). El ícono de Bandeja/reloj que hubo antes NO vuelve (Bandeja ya es uno
de los 5 destinos del menú ☰). "Más" abre `RemindersSheet` (`onMorePress`).

## Interacciones no obvias

- **Quick Add** (`components/quickAdd/QuickAddSheet.tsx`): hoja global montada en
  `app/_layout.tsx`, se abre con `useQuickAddStore.getState().open(type)` desde el
  FAB de cualquier pantalla. Task **no tiene campo "Hora" propio** — solo
  "Recordarme" (`TimeFieldRow`, `taskReminderMinutes: number | null`); a
  diferencia de la primera versión de este flujo, **"Recordarme" en Apagado ya
  no manda el ítem al Inbox** — el botón "+" es global, no un capturador de
  Inbox (ese ya existe aparte, en el campo dedicado de `InboxScreen`). Un
  recordatorio con hora además dispara la notificación (ver "Modelo de
  datos"). Los demás tipos con "Recordarme" (Event/VoiceMemo/Note) funcionan
  igual respecto al propio campo: `null` = apagado (sin notificación), un
  número (o el sentinel `ANY_TIME_MINUTES`) = con recordatorio. Nota de voz
  requiere grabación real (`useVoiceRecorder`) antes de poder guardar.
  **Campo Día para los 6 tipos** (2026-08-31, a pedido explícito): Quick Add
  tiene un `DateFieldRow` compartido (`dateKey`, un solo estado para todos los
  tipos — antes solo la Nota tenía fecha elegible, el resto quedaba fijo a
  hoy) arriba de todo el `fieldGroup`. Default hoy, calendario de mes para
  elegir cualquier día; `handleSave` usa ese `dateKey` para `date` Y para
  armar `reminderAt`. SIN opción de Inbox (sin `allowInbox`) — Quick Add nunca
  manda al Inbox; para eso sigue estando el campo de captura de `InboxScreen`
  o reclasificar después en `ItemDetailSheet`. Los hábitos también muestran el
  campo (su `date` es "fecha de creación", la recurrencia sigue decidiendo en
  qué días aparecen — poner fecha futura no lo esconde de Today).
- **Arrastrar hacia abajo desde el handle cierra la hoja** (agregado
  2026-09-11 a pedido explícito — antes el handle era puramente decorativo,
  solo se cerraba tocando la "X" o el backdrop). Hook compartido
  `src/hooks/useSheetDragDismiss.ts` (`Gesture.Pan` + shared value
  `translateY`, `withSpring` de vuelta a 0 si se suelta antes del umbral
  —120px/800px·s—, o `withTiming` hacia afuera de pantalla y recién ahí
  `runOnJS(close)` si se pasa) — aplicado en `QuickAddSheet.tsx`,
  `ItemDetailSheet.tsx` y `CategoryFormModal.tsx` (las 3 hojas con el mismo
  patrón de handle + `Modal` `animationType="slide"`). El `GestureDetector`
  envuelve solo el `handleGrabArea` (zona de agarre más alta que la barrita
  visual de 4px, mismo criterio que un `hitSlop`), pero el `translateY`
  anima la `Animated.View` de la hoja completa. Si se agrega OTRA hoja con
  este mismo patrón de handle, adoptar el mismo hook en vez de reinventar el
  gesto — no se aplicó a `AutoTrackModal.tsx` todavía (fuera de alcance de
  este pedido, evaluar si se pide).
- **Link editable en task Y event** (2026-08-31): `LinkFieldRow`
  (`components/quickAdd/LinkFieldRow.tsx`, input de URL + botón "↗" para
  abrir) en Quick Add e `ItemDetailSheet`, para `task` y `event`. Antes el
  `link` era solo-lectura y solo de `task` (se veía si venía sembrado, no
  había forma de ponerlo). `Event` ganó el campo `link: string | null`
  (misma columna SQL `link` que `Task` — tocar `dayItem.ts` + `toRow` de
  `dayItemRepository.ts`). La fila de Today/agenda muestra el botón "↗"
  (`hasLink`) para ambos tipos. Se sacó la `linkCard` de solo-lectura que
  tenía `ItemDetailSheet` (la reemplaza el `LinkFieldRow`).
- **Vista agrupada de Today** (`TodayScreen.tsx` + `TodayGroupHeader.tsx`,
  2026-09-01): el 3er ícono del header (`filter-list`, `TopAppBar` →
  `onToggleGroup`/`grouped`, se pinta en `accent` cuando está activo) alterna
  la lista entre plana y agrupada por tipo. Agrupada: secciones **Eventos ›
  Tareas › Hábitos › Notas › Audios** (`GROUP_ORDER` en `TodayScreen`;
  Momentos no está en Today), cada una con un `TodayGroupHeader` (etiqueta +
  conteo + línea de guiones + chevron, toda la fila tocable para colapsar/
  expandir esa sección). Secciones vacías se ocultan. Estado **solo de
  sesión** (`grouped`/`collapsedGroups` son `useState` en `TodayScreen` —
  arranca plano/expandido, se resetea al reiniciar la app; decisión
  explícita). Respeta los mismos filtros que la lista plana (tareas hechas /
  hábitos completados / momentos no se muestran). Con búsqueda activa el
  agrupado se ignora. Se implementa como `flatMap` de `[header, ...filas]`
  como hijos directos del `ScrollView` (no `View` por grupo) para que el
  `gap: 12` y las animaciones Reanimated por fila sigan funcionando.
- **Agregar por voz / texto (speed-dial del FAB)** (2026-09-02, a pedido
  explícito con referencia visual estilo my-wallet-app). Tocar el FAB "+" ya
  NO abre Quick Add directo: abre un **speed-dial** (`components/AddMenu.tsx`,
  `store/addMenuStore.ts`, montado en `_layout.tsx`) — el "+" se transforma en
  "×" y aparecen escalonadas (Reanimated `FadeInDown`) dos pills sobre él:
  **"Por voz"** (mic, `accent`) y **"Por texto"** (doc, azul). "Por texto" →
  Quick Add vacío de siempre. "Por voz" → `store/voiceAddStore.ts` abre
  `components/voiceAdd/VoiceAddScreen.tsx` (modal full-screen, orbe con
  `RadialGradient` + anillos que laten, `expo-speech-recognition`, auto-stop a
  2 s de silencio, `expo-haptics`, permiso/error con reintento). Al terminar:
  `domain/voiceParser.ts` → `parseVoiceInput(raw, lang)` arma un `VoicePrefill`
  (tipo/título limpio/día/hora/prioridad/categoría/repetición — parser offline
  con keywords, es+en, UN ítem por frase) → `quickAddStore.openWithPrefill()`
  abre Quick Add pre-llenado (aplica el prefill DESPUÉS de `resetForm`, solo
  pisa los campos detectados; hora de hábito → bucket Mañana/Tarde/Noche;
  vocabulario de `repeat` según el tipo). El usuario confirma y guarda. Wireo:
  Today/Calendar/Inbox pasan `onAddPress={() => useAddMenuStore.getState().open()}`
  (Inbox solo fuera de selección múltiple); el `×` del `AddMenu` se dibuja 60px
  (vs. 56 del FAB real) y con elevación alta para tapar por completo el FAB
  real que queda detrás del backdrop (bug "FAB duplicado" ya corregido —
  alinear con `FLOATING_BAR_HEIGHT`/`FLOATING_BAR_MARGIN`). **"Quick Add en
  lenguaje natural" es feature Pro** (ver Roadmap Pro) — esta es la versión
  offline gratis, equivalente a la de my-wallet-app; la versión con IA
  (multi-ítem, más precisa) queda pendiente.
- **"Cualquier hora" (Any Time) es un control real elegible, no solo un dato
  de ejemplo**: `TimeFieldRow` (`components/quickAdd/TimeFieldRow.tsx`) maneja
  `minutes: number | null` con TRES estados — `null` = Apagado, un número =
  hora real, `ANY_TIME_MINUTES` (`domain/time.ts`, sentinel `-1` en memoria,
  distinto del `ANY_TIME_HHMM` `"24:00"` que se persiste en `reminderAt`) =
  recordarme sin hora puntual. Se habilita pasando la prop `allowAnyTime` —
  hoy solo en las filas "Recordarme" de Task/VoiceMemo/Note (en Quick Add e
  ItemDetailSheet), NO en "Empieza" de Event (esa es una hora real del
  evento, no un recordatorio). Con `allowAnyTime`, `TimePickerModal` →
  `WheelTimePicker` muestra un botón extra "Cualquier hora"
  (`onSelectAnyTime`) entre las ruedas y Cancelar/Confirmar. Al guardar, un
  helper local `reminderAtFromMinutes(dateKey, minutes)` (duplicado a
  propósito en `QuickAddSheet.tsx` e `ItemDetailSheet.tsx`, son formas
  ligeramente distintas por el manejo de Inbox) convierte el sentinel a
  `ANY_TIME_HHMM` en el `reminderAt` persistido; al releer un ítem existente,
  `reminderMinutesOrNull` hace el camino inverso — si esto se pierde, un
  ítem con recordatorio "Any Time" se ve como "Apagado" al reabrirlo en
  `ItemDetailSheet` (bug real ya corregido, no reintroducirlo).
- **Detalle de ítem** (`components/itemDetail/ItemDetailSheet.tsx`): se abre
  tocando cualquier fila (`useItemDetailStore.getState().open(id)`), reusa los
  mismos subcomponentes que Quick Add pero pre-poblados desde el ítem existente.
  Cablear el `onPress` en cada fila al agregar una pantalla nueva con
  `DayItemRow`/`InboxItemRow` — ya pasó una vez que `InboxItemRow` quedó sin
  `onPress` (bug corregido). El campo **Fecha** usa `DateFieldRow` (calendario de
  mes completo, no un ciclo) — puede elegirse cualquier día, no solo Hoy/Mañana;
  si un ítem del Inbox se abre y se guarda sin tocar la fecha, tiene que quedarse
  en el Inbox — `dateKey === null` fuerza `status: 'inbox'` en el guardado.
  **La interfaz es a propósito un espejo de `QuickAddSheet`** (a pedido del
  usuario, "misma interfaz que Quick Add"): header con título grande del tipo +
  botón "X" que solo cierra (no guarda — igual que en Quick Add, donde la "X"
  descarta el ítem no creado), `TypeTabs` debajo del header para RECLASIFICAR el
  ítem existente (p. ej. una task capturada rápido en el Inbox que en realidad
  era un Event), y el campo de título en una caja con borde (`inputBox`, mismo
  estilo que `QuickAddSheet`) en vez del `TextInput` grande sin caja de antes —
  la única diferencia real con Quick Add es que ese campo llega PRE-LLENADO con
  el texto existente en vez de mostrar el placeholder. Guardar sigue siendo
  exclusivamente el botón inferior "Actualizar ___" (`handleSave`), la "X" nunca
  persiste cambios. `handleTypeChange` resetea SOLO los campos específicos del
  tipo anterior a sus defaults (no título/fecha/categoría/prioridad, que sí se
  conservan — a diferencia de Quick Add, que resetea todo al cambiar de tipo
  porque ahí se está creando desde cero). Si se cambia a Nota de voz sin
  grabación existente, aparece el mismo `VoiceRecordRow`/`useVoiceRecorder` que
  Quick Add y el botón de guardar queda deshabilitado hasta grabar algo. Al
  guardar con un tipo distinto al original, los campos específicos del tipo
  NUEVO que no existían en el ítem original arrancan del mismo default sensato
  que usa `QuickAddSheet` al crear (ver el bloque `if (type === ...)` de
  `handleSave`).
- **Wheel-picker de hora** (`components/timePicker/`): `TimePickerModal` envuelve
  `WheelTimePicker` (columnas de hora 1–12 / minuto 0–59 que scrollean con snap
  vía `FlatList`, más toggle AM/PM). Trabaja siempre en minutos-desde-medianoche
  (`domain/time.ts`), igual que el resto del dominio de horas. Gotcha real ya
  resuelto: `initialScrollIndex` de `FlatList` en Android a veces no aplica el
  offset en el primer frame y la columna aparece vacía al abrir — el fix es
  `onContentSizeChange` re-aplicando `scrollToOffset({animated:false})` una vez
  que el contenido terminó de medirse, más `initialNumToRender={values.length}`
  (listas son cortas, 12/60 ítems, renderearlas enteras de entrada es barato y
  evita el bug de clipping de `removeClippedSubviews` combinado con scroll
  programático). Si se toca este componente y "se abre vacío", es este bug
  volviendo, no un problema nuevo.
- **Calendario de día** (`components/datePicker/`): `DatePickerModal` +
  `MonthCalendarPicker`, reutiliza `domain/calendarGrid.ts` (la misma grilla de
  mes que usa la pestaña Calendar) y `WeekdayHeaderRow` de `components/calendar/`.
  Los chips rápidos arriba del calendario son solo "Hoy" (+ "Bandeja" si
  `allowInbox`) — sin "Mañana" a propósito.
- **Arrastrar para poner hora** (`components/TimeDragOverlay.tsx` +
  `store/timeDragStore.ts` + `components/FloatingBar.tsx`): tocar el "—" de una
  fila activa un gesto de `react-native-gesture-handler` que cubre la pantalla
  (excepto la franja inferior reservada para `FloatingBar`, ver
  `floatingBarGeometry.ts`) — deslizar en cualquier lugar cambia la hora en pasos
  de 15 min. La fila arrastrada muestra un pill coral con hora 12h + chevrons
  (`DayItemRow` → `TimeMarker.kind === 'dragging'`), y a lo largo del borde
  izquierdo aparece una regla de marcas horizontales (`TimeRuler`). La barra de
  confirmar/cancelar **no es un overlay aparte** — es `FloatingBar` estirándose
  hacia arriba (`TimeConfirmRow`) mientras `useTimeDragStore().active` es true; no
  reintroducir una barra flotante separada para esto, quedaría superpuesta con el
  menú principal (ya pasó, fue un bug corregido). Todo esto es fiel a un video de
  referencia del usuario, no un capricho de diseño. Confirmar
  (`timeDragStore.confirm()`) agenda el ítem Y programa una notificación real —
  ver "Modelo de datos" arriba.
- **Reproducción de nota de voz**: cada fila de voice memo llama
  `useVoiceMemoPlayer(uri)` (un `expo-audio` player por fila; ahora también
  expone `currentTime`). Si se agregan listas muy largas, revisar performance (un
  player nativo por ítem visible). Al tocar play, la fila entera cambia de diseño:
  `TodayItemRow` pasa `playbackExpanded` a `DayItemRow`, que reemplaza
  ícono+título por una barra de controles (tiempo transcurrido, "waveform"
  decorativo, eliminar, play/pausa, cerrar). Cerrar (X) pausa el audio y colapsa
  de vuelta al diseño normal. **Eliminar en esta barra borra SOLO el audio, no el
  ítem** (`dayItemsStore.clearVoiceMemoAudio` — borra el archivo físico vía
  `expo-file-system` y vacía `audioFileUri`/`durationSeconds`, dejando el
  `DayItem` intacto); la fila pasa a mostrar "Audio eliminado" en vez de los
  controles de reproducción, sin volver a abrir el player. Para borrar el
  `DayItem` completo (cualquier tipo, incluida una voice memo) usar el gesto de
  swipe descrito abajo. No hay botón "guardar" en esa barra — se evaluó y se
  descartó, no tiene una acción real para una nota ya persistida.
- **`VoiceRecordRow` (grabar DENTRO de Quick Add/`ItemDetailSheet`, distinto de
  la reproducción de arriba) rediseñado 2026-09-11 con referencia visual — 3
  estados en un solo componente**, no un simple toggle grabar/detener:
  1. Inactivo — fila "Toca para grabar" (ícono mic).
  2. Grabando — card con punto rojo pulsante (`RecordingDot`,
     `withRepeat`/`withTiming` de Reanimated, se congela sin pulsar en
     pausa) + timer + botones Pausar/Reanudar y Detener.
  3. Grabada — fila de reproducción (▶/⏸ con `useVoiceMemoPlayer`, waveform
     decorativo, duración, basurero para descartar y volver a grabar).
  Pausar/reanudar es real (`useVoiceRecorder` ganó `pause()`/`resume()`,
  llaman al `pause()`/`record()` nativos del `AudioRecorder` de `expo-audio`
  — no cortan la sesión de grabación) y el estado de pausa se maneja LOCAL
  al componente (`useState`), no en el padre — Quick Add/`ItemDetailSheet`
  solo necesitan el resultado final (`onRecorded(uri, seconds)`) y poder
  descartarlo (`onDelete`), igual que antes. El componente recibe el objeto
  `recorder` completo (`{isRecording, durationSeconds, start, pause, resume,
  stop}`) en vez de un solo `onPress` que alternaba grabar/detener. El
  ícono de la pestaña "Nota de voz" en `TypeTabs` pasó de un ecualizador
  (`equalizer`) a un micrófono (`mic`, `QUICK_ADD_META.voiceMemo.icon`) el
  mismo día — pedido explícito, no se tocó el ícono de voice memo en otros
  lados (`ICON_BY_TYPE`/`mapDayItemToRow.ts` siguen igual).
- **Nota: cuerpo de texto editable** (agregado 2026-09-11 — `richTextBody`
  existía en el modelo/columna SQL desde el principio pero nunca fue
  editable, siempre se guardaba `''`). Quick Add e `ItemDetailSheet` ahora
  muestran un cuadro de texto multilinea "Escribe una nota..." debajo del
  título, solo para `type === 'note'` (mismo estilo de caja que el título,
  `noteBodyBox`). Por consistencia con "Campo Día para los 6 tipos" (posición
  fija en el `fieldGroup`), el cuerpo NO se movió al medio de Categoría/Fecha
  como en algunas referencias — va siempre entre el título y el resto de
  campos, en las dos hojas.
- **Eliminar un ítem (swipe)**: en Today, Inbox y la agenda Semana de Calendar,
  deslizar una fila a la izquierda revela un botón rojo de eliminar a la derecha
  (`SwipeToDeleteCard`, gesto propio con `react-native-gesture-handler` +
  Reanimated, mismo patrón que el proyecto hermano "my-wallet-app" pero
  reimplementado sin `Animated`/`PanResponder`). Tocar el botón borra **directo,
  sin confirmar antes** — `dayItemsStore.remove` / `inboxStore.remove` /
  `useWeekAgenda().remove`, los tres cancelan la notificación pendiente y
  muestran la fila de Undo (`useUndoStore` + `UndoRow` en
  `components/FloatingBar.tsx`) por 4s (`UNDO_DURATION_MS`, exportado desde
  `undoStore.ts`). **Desde 2026-08-29 es una card flotante SEPARADA por encima
  de toda la barra inferior** (a todo el ancho, fondo/sombra propios, hueco
  `FLOATING_BAR_ROW_GAP` = 10 px debajo), NO pegada al pill — mismo mecanismo y
  card que `TimeConfirmRow` y que la fila `topRow` "Volver a hoy"
  (`dragging ? <TimeConfirmRow/> : undoVisible ? <UndoRow/> : topRow`,
  mutuamente excluyentes). Antes (2026-08-25 a 2026-08-29) era `FloatingBar`
  estirándose hacia arriba en una card continua fila+pill; el usuario pidió
  explícitamente separarla. Anillo de progreso a la izquierda (`react-native-svg`
  `Circle` + `Animated.createAnimatedComponent`, `strokeDashoffset` animado
  con Reanimated de 0 a `RING_CIRCUMFERENCE` en `UNDO_DURATION_MS`, sentido
  horario desde las 12 vía `rotation={-90}`) que se rellena en tiempo real
  hasta completarse justo cuando el Undo se autocierra — ícono
  (`delete-outline` en rojo / `check` en accent) centrado adentro del anillo,
  mensaje al medio, pastilla "↩ Deshacer" a la derecha. Como ahora vive
  DENTRO de `FloatingBar`, cualquier otro elemento flotante posicionado
  relativo a su altura (`CalendarFilterBar`) tiene que sumar la misma
  `FLOATING_BAR_CONFIRM_ROW_HEIGHT + FLOATING_BAR_ROW_GAP` extra cuando
  `useUndoStore().visible` es true, igual que ya hacía con `dragging` — mismo
  bug real de superposición que si se olvida. Tocar "Deshacer" reinserta el
  `DayItem` exacto vía `upsert` y reprograma su notificación con
  `syncReminderNotification`; si expira el tiempo o se dispara otra acción
  mientras tanto, la anterior queda definitiva en silencio (mismo patrón que
  Gmail — solo un Undo pendiente a la vez). Este patrón reemplazó al
  `ConfirmDialog` que antes preguntaba "¿Eliminar este ítem?" antes de borrar
  (pedido explícito del spec — sección "UX clave": "toda acción destructiva
  muestra snackbar con Deshacer"); `ConfirmDialog.tsx` sigue existiendo en el
  design system por si una acción destructiva futura lo necesita, pero hoy no
  lo usa ningún componente. Si una fila completada (`completed: true`) usa
  este componente, `DayItemRow` necesita `needsOffscreenAlphaCompositing` en
  el `View` exterior — sin eso, en Android el `opacity` de la fila completada
  "transparenta" el botón rojo aunque esté cerrado (bug real ya corregido, no
  reintroducirlo si se toca ese estilo).
- **Checkbox de Task siempre muestra el ícono de check** (`DayItemRow.tsx` →
  `LeadingView`, `leading.kind === 'checkbox'`): el glifo `check` se renderiza
  SIEMPRE dentro del cuadro, en `dim` cuando no está completada y en blanco
  sobre fondo `accent` cuando sí — antes solo se mostraba al completar,
  dejando un cuadro vacío sin ninguna señal de que la fila fuera una Task
  (fiel a la referencia real de mock del usuario, donde el checkbox de Task
  siempre lleva el check visible como identificador del tipo, y solo el
  relleno de color indica completado). No confundir con el flujo de
  completar descrito abajo, que sigue intacto — cambia el color/relleno, no
  la visibilidad del glifo.
- **Completar una Task (desaparece de Today)**: tocar el checkbox de una Task
  en Today (`dayItemsStore.toggleComplete`) la marca `status:'done'` en la DB
  como siempre, pero además `TodayScreen` filtra las tasks `done` de
  `visibleRows` — la fila desaparece de la lista con la animación `exiting`
  de Reanimated que ya tenía la lista (`FadeOut`), y aparece la tarjeta Undo
  (ícono `check`, "Tarea completada"). El registro NO se borra ni se saca de
  `items` (sigue contando para "X de Y hechos" en `DayBar`) — solo se oculta
  en el render, por eso sigue intacto para cualquier otra vista. **Esto es
  específico de Today**: la agenda Semana de Calendar (`WeekAgendaView`)
  sigue mostrando tasks completadas tachadas, sin ocultarlas — a propósito,
  para que el registro completo siga siendo visible en Calendar (pedido
  explícito: "ten en cuenta ese registro para la vista de Calendario"). Hoy
  esto solo aplica a Task porque es el único tipo con checkbox tocable en
  Today (`mapDayItemToRow.ts` — Habit muestra un ícono de progreso/ring, no
  un checkbox; no tiene tap-to-complete en Today todavía).
- **Tareas atrasadas — rollover a Today** (agregado 2026-09-16, a pedido
  explícito: "que se desplace al siguiente día (pendiente por cumplir)").
  Decisión de diseño explícita (`AskUserQuestion` al usuario): el rollover es
  **virtual, no destructivo** — mismo criterio que ya usan las ocurrencias
  recurrentes de hábitos (ver más abajo), en vez de mutar la columna `date`
  real de la tarea día a día. `dayItemRepository.listOverdueTasks(dateKey)`
  trae las tareas `type:'task'`/`status:'scheduled'` con `date` anterior a
  `dateKey`; `dayItemsStore.reload()` las suma a `items` SOLO cuando
  `selectedDateKey` es el día real de hoy (`toDateKey(new Date())`, no al
  navegar a un día pasado/futuro con las flechas) — van primero en el orden,
  antes que los ítems propios del día. **La `date` original de la tarea
  nunca se toca**: Calendario la sigue mostrando en su día original (el
  rollover es puramente de Today), y completarla (`toggleComplete`, mismo
  flujo de siempre) la saca de la lista sin más lógica especial. Señal visual:
  `TrailingBadge` nuevo `{kind:'overdue'}` (ícono `schedule` en
  `palette.danger`, máxima precedencia en `trailingBadgesFor` —
  `mapDayItemToRow.ts` — antepuesto al resto) para cualquier task con
  `date < hoy` y `status !== 'done'`, sin importar si aparece por rollover en
  Today o se ve en otra pantalla (Calendario/agenda Semana) — es información
  real del ítem, no un estado exclusivo de Today. Limitación conocida (mismo
  alcance que hábitos): solo Task, porque es el único tipo con checkbox
  tocable en Today.
- **Agendar un ítem del Inbox para hoy (swipe derecho)**: deslizar una fila del
  Inbox hacia la DERECHA (desde el borde izquierdo) revela un botón verde "Hoy" —
  soltar pasado el umbral llama `inboxStore.scheduleToday(id)` (agenda
  `date`/`status:'scheduled'` para hoy y saca el ítem del Inbox) sin
  `ConfirmDialog`, porque no es destructivo. Implementado extendiendo
  `SwipeToDeleteCard` con `onScheduleToday` (opcional — sin ese prop el
  componente se comporta exactamente igual que antes, swipe izquierdo solamente).
- **Búsqueda** (`TopAppBar` + `store/searchStore.ts`, solo en Today): NO es una
  pantalla ni un modal aparte — al tocar la lupa, el campo de búsqueda aparece
  DEBAJO del header completo (título/subtítulo/íconos siguen ahí), y la lista de
  ítems de Hoy sigue mostrándose sin cambios hasta que hay una búsqueda real (3+
  caracteres tipeados, o Enter). `searchStore.results` es `DayItem[] | null`:
  `null` = "todavía no se buscó nada, mostrar los ítems de Hoy tal cual";
  un array (aunque vacío) = resultados reales, reemplazan la lista con una
  transición de fundido/reflow (Reanimated `FadeIn`/`FadeOut`/`LinearTransition`
  en cada fila). Los resultados abarcan CUALQUIER fecha/Inbox (`searchByTitle`
  hace `LIKE` sobre toda la tabla), por eso usan una fila propia (icono de tipo +
  título + fecha corta) en vez de `TodayItemRow` — reusar `TodayItemRow` ahí
  rompería `onToggleComplete`/`onDelete` porque esos handlers de `dayItemsStore`
  solo conocen los ítems del día seleccionado.
- **Próximos recordatorios** (ícono de reloj en `TopAppBar` +
  `store/remindersStore.ts` + `components/reminders/RemindersSheet.tsx`): hoja
  modal (mismo patrón de card flotante que usaba el viejo `NavigateMenu`) con los ítems que tengan
  `reminderAt` desde el instante actual en adelante (`listUpcomingReminders`,
  incluye el sentinel `ANY_TIME_HHMM`/Any Time), ordenados cronológicamente. Si aparece
  vacío no es un bug — es que ya pasó la hora de todos los recordatorios de hoy;
  confirmar la hora actual del dispositivo antes de asumir que algo está roto.
- **Filtro de Calendario** (`store/calendarFilterStore.ts` +
  `components/calendar/CalendarFilterSheet.tsx`): la hoja se abre hoy desde el
  botón "•••" del header (`useCalendarFilterStore.getState().openSheet()`) —
  **`CalendarFilterBar.tsx` (la pill flotante que vivía anclada arriba de
  `FloatingBar`) se sacó de `CalendarScreen.tsx` el 2026-08-26** a pedido
  explícito ("ya lo tenemos en los ⋯", quedaba duplicado con el botón nuevo
  del header). El archivo queda en el repo sin uso por si hiciera falta ese
  patrón de pill en otro lado — no volver a montarla en Calendar sin que se
  pida. La hoja lista "Todo" + un tipo por fila
  (Tasks/Events/Notes/Voice notes/Moments) + una sección "HÁBITOS" con un ítem
  por cada hábito EXISTENTE en la DB por título (`listDistinctHabitTitles`, no
  un genérico "Habit") — filtrar por un hábito específico filtra por
  `type === 'habit' && title === X`, no por tipo. El filtro aplica a los puntos
  de color y la miniatura de Moment del grid mensual (`MonthDayCell.tsx`, ver
  más abajo) y a la agenda semanal; NO afecta el heatmap de Año porque ese
  heatmap ya es un placeholder sintético (ver
  "Simplificaciones conocidas") — filtrar data falsa no tendría sentido. El ícono
  de embudo (`filter-list`) de la pill solo se muestra para la selección actual
  cuando el filtro es un tipo/hábito específico — si el filtro es "Todo"
  (`kind: 'everything'`) NO se repite el ícono de embudo una segunda vez junto a
  "Todo" (`currentIcon` queda `null` en ese caso); mostrarlo ahí era un bug real
  ya corregido (pill se veía "⧩ Filtro | ⧩ Todo").
- **Grid de Mes: puntos de color + miniatura de Moment por día**
  (`components/calendar/MonthDayCell.tsx`, agregado 2026-08-26, fiel al mock
  de Pen "Calendar Screen") — reemplazó las etiquetas mini de texto (títulos
  de ítems recortados) que tenía antes cada celda. Ahora cada celda recibe
  `items: DayItem[]` (ya filtrados por `calendarFilter`) en vez de
  `labels: string[]`: separa el/los `Moment` del resto
  (`items.filter(i=>i.type!=='moment')`) — el `Moment` (si hay uno ese día)
  se muestra como una miniatura real (`Image` con `moment.mediaUri`, mismo
  patrón que `MomentsDayRow` — NO un color plano de placeholder) debajo del
  número de día; el resto de ítems (Task/Event/Note/VoiceMemo/Habit) se
  muestran como puntos de color arriba del número, uno por ítem
  (`item.categoryColor ?? palette.accent`, tope `MAX_DOTS = 3`). Si un día
  tiene más de un Moment (desde 2026-08-29 se pueden guardar varias fotos por
  día), solo se muestra la primera en la celda — no hay carrusel.
  **Cada celda es tocable** (agregado 2026-08-26, `onPress` opcional en
  `MonthDayCell`, pedido explícito): tocar un día navega a Today mostrando la
  lista completa de ítems de ESE día, no solo el día actual. Ver más abajo
  ("Ir a un día puntual desde Calendar") el mecanismo real — escribir
  `dayItemsStore.selectedDateKey` directo NO alcanza.
- **3 vistas de Calendario** (`CalendarViewSwitch`, orden Mes/Semana/Año), **Mes es la vista inicial al entrar a Calendar** (`useState<CalendarView>('month')` en `CalendarScreen.tsx`, cambiado 2026-08-26 a pedido explícito — antes abría en Año):
  Semana es una agenda vertical por día que reusa `TodayItemRow` con handlers
  PROPIOS (`useWeekAgenda`, no `dayItemsStore`) porque sus ítems pueden ser de
  cualquier día de la semana, no solo el "día seleccionado" que asume
  `dayItemsStore`. El selector de días (L M M J V S D) vive en el header FIJO de
  Calendar, fuera del `ScrollView` de la lista, para quedar sticky al hacer
  scroll; tocar un día hace scroll automático a su sección (offsets medidos con
  `onLayout` en cada sección + `ScrollView.scrollTo`, guardados en un `ref` en
  `CalendarScreen`, no en `useWeekAgenda`). **También se puede cambiar de vista
  con un swipe horizontal** sobre el contenido (no solo con `CalendarViewSwitch`)
  — `Gesture.Pan` (`swipeViewGesture` en `CalendarScreen.tsx`) con umbral alto
  (`activeOffsetX` ±40px / 600px·s) para no competir con el swipe-to-delete de
  las filas de Semana (`SwipeToDeleteCard`, activeOffsetX ±10 — al ser más
  exigente el gesto de pantalla, la fila gana siempre que el toque arranca sobre
  ella). Las 3 `ScrollView` de las vistas se importan de
  `react-native-gesture-handler`, no de `react-native` — mezclar el `ScrollView`
  nativo con un `Gesture.Pan` ancestro no compone bien con RNGH (el swipe no se
  detectaba). El orden real para el gesto es `CALENDAR_VIEW_ORDER` en
  `features/calendar/calendarView.ts` (`['month','week','year']`, mismo orden
  que `CalendarViewSwitch`) — el swipe hace `clamp`, no wrap-around (swipear a la
  izquierda estando en Año, o a la derecha estando en Mes, no hace nada).
- **Captura rápida de Inbox** (`InboxScreen` + `inboxStore.create`): el campo
  "¿Qué tienes en mente?" arriba de la lista crea una Task directo (sin abrir
  Quick Add) con status `'inbox'` y el resto de campos en su default — el
  usuario la clasifica/completa después editando el ítem. Por esto mismo, las
  filas de Inbox (`InboxItemRow`) **no muestran el ícono de tipo** en el círculo
  punteado (queda vacío a propósito, `borderColor: palette.textDim` para que se
  vea sobre fondo claro — un `rgba(255,255,255,0.3)` legado ahí era invisible en
  el tema claro, bug real ya corregido): mostrar el tipo contradice la idea de
  "no sé qué es esto todavía, lo clasifico luego". Si una task tiene `link`, la
  fila sí muestra un ícono de archivo + botón de abrir (↗) en vez de la fecha
  relativa.
- **Estados vacíos** (`components/EmptyState.tsx`): Today (sin ítems agendados
  ese día), Inbox (sin ítems pendientes) y Moments (sin ninguna foto guardada)
  muestran el mismo componente — ícono flotante + título + mensaje + botón CTA
  opcional (`ctaLabel`/`onPressCta`, agregado 2026-08-25 junto con el diseño
  Pen "Empty State / No Tasks Today"; Today abre Quick Add, Inbox enfoca el
  campo de captura rápida; Moments ya NO usa el CTA — muestra igual la fila
  "Hoy" con el botón "+" arriba del `EmptyState`). **Si el contenedor es un `FlashList` (como Inbox), NO
  usar su `ListEmptyComponent`** para esto — `FlashList` no le da altura
  completa al empty component, así que el `flex:1`/`justifyContent:'center'`
  de `EmptyState` no tiene espacio para centrarse (bug real ya corregido:
  quedaba pegado arriba, bajo el header). Renderizar en cambio un `View`
  normal con `flex:1` como hermano condicional del `FlashList` (mismo alcance
  que Today: `paddingBottom` igual al que reserva la lista para la barra
  flotante absoluta, o el contenido se centra de más hacia abajo, detrás de
  la barra). NO se agregó a Calendar Mes/Año (son grillas, no listas —
  siempre muestran su estructura aunque no haya ítems) ni a la agenda
  semanal de Calendar (ya tenía su propio mensaje corto "Sin ítems" por día,
  en `WeekAgendaView`, que es suficiente ahí y se dejó como estaba).
- **Skeleton de carga** (`components/ListSkeleton.tsx`, agregado 2026-08-29 a
  pedido explícito): antes, al entrar a Today/Inbox/etc. se veía un instante
  el `EmptyState` ("Nada agendado") antes de que cargara la lista real — una
  UX molesta. Ahora, mientras el store/hook está `loading` Y todavía no hay
  nada que pintar, se muestra una maquetación gris pulsante que **llena toda
  la pantalla** (no un número fijo de filas — eso daría a entender "hay justo
  N ítems"; el `count` se calcula con `useWindowDimensions` para rebasar el
  borde inferior). Al llegar los datos hace fundido a la lista real. La
  condición es siempre `loading && <no hay filas visibles>` — al cambiar de
  día desde una lista con ítems, `items` conserva los anteriores hasta que
  llega la nueva tanda, así que NO parpadea el skeleton. Wireado en: Today
  (`dayItemsStore.loading` arranca en `true`), `InboxScreen`
  (`inboxStore.loading` arranca en `true`), agenda Semana de Calendar
  (`useWeekAgenda` expone `loading`, init `true`) y `MomentsScreen`
  (`variant="tiles"`, state local). NO en Calendar Mes/Año (grillas, siempre
  muestran estructura) ni en Ajustes.
- **Cambiar de día en Today** (`components/DayBar.tsx`): además de los
  chevrons, deslizar el pill de fecha a la izquierda/derecha cambia de día
  (agregado 2026-08-25, `Gesture.Pan` de `react-native-gesture-handler`,
  umbral bajo ±16px ya que no compite con ningún otro gesto ahí). **Tocar el
  pill (fuera de los chevrons) abre el calendario de mes (`DatePickerModal`,
  el mismo picker reusado de Quick Add) para saltar a cualquier día**
  (cambiado 2026-09-16 a pedido explícito — antes saltaba directo a hoy). El
  atajo directo a hoy sigue existiendo, pero se movió a su propio prop
  `onBackToToday` — es lo que dispara la fila "Volver a hoy" (ver abajo), que
  antes reusaba el mismo `onDatePress` que el pill. Cuando el día mostrado no
  es hoy, se pasa la prop `topRow` de `FloatingBar` con esa fila "Volver a
  hoy" (`BackToTodayRow`, interno de `DayBar.tsx`) — que desde 2026-08-29 se
  renderiza como la misma **card flotante separada por encima de la barra**
  que `TimeConfirmRow`/`UndoRow` (mutuamente excluyentes, altura
  `FLOATING_BAR_CONFIRM_ROW_HEIGHT`, hueco `FLOATING_BAR_ROW_GAP` debajo). Si
  se necesita este mismo patrón en otra pantalla, pasar `topRow` a su
  `FloatingBar` — no crear una pill flotante nueva aparte.
- **Deslizar en cualquier parte de la lista de Today también cambia de día**
  (agregado 2026-09-16 a pedido explícito, `TodayScreen.tsx` →
  `swipeDayGesture`): mismo mecanismo que `swipeViewGesture` de
  `CalendarScreen` (ver "3 vistas de Calendario" más abajo) — umbral alto
  (±40px/600px·s) para no competir con el swipe-to-delete de las filas
  (`SwipeToDeleteCard`, activeOffsetX ±10): el gesto de la fila gana siempre
  que el toque arranca sobre ella, este solo captura el swipe cuando arranca
  en un hueco sin fila (los tiempos con hora también son zona de arrastre,
  ver "Arrastrar para poner hora" — tampoco hay hueco ahí). Por esto mismo el
  `ScrollView` de Today se importa de `react-native-gesture-handler`, no de
  `react-native` (mismo Gotcha que Calendar — un `ScrollView` nativo no
  compone con un `Gesture.Pan` ancestro). Se ignora mientras hay una búsqueda
  activa (`isFiltering`).
- **`TypeTabs` se selecciona por arrastre continuo, no solo por toque**
  (`components/quickAdd/TypeTabs.tsx`, agregado 2026-08-26 a pedido
  explícito, compartido por Quick Add e `ItemDetailSheet`): mantener
  presionado en cualquier parte del track y mover el dedo a la izquierda o
  derecha va seleccionando en vivo el tipo que queda bajo el dedo — no es un
  paso a la vez como el swipe de `DayBar`, sino posición absoluta (`Gesture.Pan`
  con `minDistance(0)` para que arranque apenas se toca; `onBegin`/`onUpdate`
  calculan el índice a partir de `event.x / trackWidth`, medido con `onLayout`
  **sobre el `View` que envuelve `GestureDetector` (la fila de tabs), NO sobre
  el `track` exterior** — `event.x` es relativo a la vista donde cuelga el
  gesto, así que medir el ancho de un contenedor distinto con padding propio
  da un índice sistemáticamente corrido, bug real ya corregido). Todo el
  cálculo de índice va inline dentro de los callbacks `onBegin`/`onUpdate`
  (workers de Reanimated) — **nunca llamar ahí a una función JS intermedia no
  marcada como worklet** (p. ej. un `indexFromX` extraído aparte): revienta en
  runtime con "Tried to synchronously call a Remote Function" (bug real ya
  corregido). Solo `selectIndex` (la que finalmente llama `onChange`, cambia
  estado de React) pasa por `runOnJS`.
  **La selección visual es un único "Thumb" (`Animated.View` absoluto,
  `pointerEvents="none"`) que se desliza con `withTiming` a la posición del
  índice activo — NO un cambio de `backgroundColor` por tab en cada render**
  (esa primera versión se descartó a pedido explícito: durante el arrastre se
  veía brusco y el pill activo perdía las esquinas redondeadas intermitentemente
  por el recálculo de layout/estilo en cada índice — con un solo thumb que se
  mueve, la forma nunca se recrea). Los 5 íconos van en una capa `View` simple
  aparte, sin fondo propio, encima del thumb — cambian de color al instante
  según `value` (no animado, a propósito: solo el pill de fondo necesita
  transición suave). Los tabs individuales pasaron de `Pressable` a `View`
  simple — la selección vive enteramente en el gesto del track (`onBegin`
  cubre el toque simple sin arrastre), así que un ítem ya no dispara su
  propio `onPress`; si se necesita foco de teclado/lector de pantalla más
  fino que `accessibilityRole="tab"` en el futuro, revisar esto primero.
  `onChange` solo se llama cuando el índice calculado cambia (nunca con el
  mismo tipo repetido), para no resetear los campos del formulario en cada
  pixel de movimiento (`resetForm`/`handleTypeChange` de Quick Add/
  `ItemDetailSheet` limpian campos al cambiar de tipo). **El gesto no
  funcionaba en absoluto hasta agregar un `GestureHandlerRootView` propio
  DENTRO de cada `Modal`** — ver "Gotchas del entorno" más abajo, es un
  problema de plataforma, no de este componente en particular.
- **Tarjeta "Today" debajo del grid de Mes** (`components/calendar/
  CalendarTodayCard.tsx`, agregado 2026-08-26, fiel al "Today Card" del mock
  de Pen "Calendar Screen"): dentro del `ScrollView` de la vista Mes, justo
  después del grid — SIEMPRE datos de HOY, sin importar qué mes esté
  mostrando el grid arriba (el grid en sí no tiene concepto de "día
  seleccionado", cada celda navega directo al tocarse — ver arriba). Muestra
  "Hoy · {fecha}" + un botón "Ver día" visual + 3 columnas (Tareas hechas
  X/Y, Hábitos hechos X/Y, Momentos) + la miniatura del Moment de hoy si
  existe. **Toda la tarjeta es tocable, no solo el botón "Ver día"**
  (`Pressable` envolviendo la card completa, agregado 2026-08-26 a pedido
  explícito — el botón interno quedó como `View` puramente visual, ya no es
  su propio `Pressable` anidado). Tasks/Moments de hoy
  salen del `itemsByDate` que ya carga la vista Mes; Habits necesita su
  propio cálculo aparte (`isHabitScheduledOn` + `listAllHabitCompletionsInRange`
  para el día de hoy, mismo patrón que `dayItemsStore.reload()` →
  `loadHabitOccurrences`) porque un hábito solo vive en `itemsByDate` en su
  fecha de creación, no en cada día que recurre — no reusar `itemsByDate`
  directo para el conteo de hábitos o va a dar mal casi siempre.
- **Header de Calendario rediseñado + navegación entre meses** (agregado
  2026-08-26, fiel al mock de Pen "Calendar Screen", a pedido explícito tras
  ver ese mock — reemplaza el header anterior con título grande 34px +
  subtítulo + switch de 3 íconos): título más chico (26px) con un chevron al
  lado (`▾`), sin subtítulo, y dos botones redondos a la derecha
  (`calendar-month`/`more-horiz`). Debajo del header, un
  `SegmentedToggle` de TEXTO (Mes/Semana/Año) — el genérico de
  `components/SegmentedToggle.tsx`, no un componente nuevo. **Esto agrega
  navegación entre meses que antes no existía**: `viewedMonth` (estado nuevo
  en `CalendarScreen.tsx`, separado de `today`) es el mes que arma
  `monthGrid` — antes `monthGrid` estaba anclado a `today.getMonth()` sin
  poder cambiarlo. Tocar el título+chevron O el botón de calendario abre
  `DatePickerModal` (el mismo picker de fecha reusado de Quick Add/
  `ItemDetailSheet`, no uno nuevo) sembrado con `viewedMonth`; elegir
  cualquier día ahí solo se usa para extraer su mes/año (`fromDateKey` →
  `setViewedMonth`), el día en sí no importa, y fuerza `view` a `'month'`
  sin importar desde qué vista se abrió. El botón "•••" abre el
  `CalendarFilterSheet` que ya existía (antes solo accesible desde la pill
  flotante `CalendarFilterBar` sobre la barra inferior — ahora hay dos
  caminos al mismo filtro). La vista Año sigue anclada a
  `today.getFullYear()`, sin navegación — fuera de alcance de este cambio,
  no confundir con `viewedMonth` (que solo afecta la vista Mes). La tarjeta
  "Today" de arriba y sus stats siguen usando `today` real, nunca
  `viewedMonth` — son cosas independientes a propósito.
- **Ir a un día puntual desde Calendar (`goToDay`, agregado 2026-08-26)**:
  tanto tocar una celda del grid de Mes como tocar la `CalendarTodayCard`
  llaman `router.push({ pathname: '/', params: { date: dateKey } })` —
  **NUNCA** `useDayItemsStore.getState().setSelectedDate(...)` directo desde
  afuera. Motivo (bug real, ya corregido): el día que de verdad pinta
  `DayBar`/el header de `TodayScreen` es un `useState` LOCAL a ese
  componente (`selectedDate`), no el store — el store solo lo refleja vía un
  `useEffect` de sync en un solo sentido (local → store, nunca al revés). Un
  primer intento escribiendo solo el store no navegaba a ningún lado porque
  `TodayScreen` nunca leía ese cambio. El fix real: `TodayScreen` lee
  `useLocalSearchParams<{ date?: string }>()` y, si viene `date`, hace
  `setSelectedDate(fromDateKey(date))` en un `useEffect` con `[dateParam]`
  como dependencia. Si se agrega OTRO punto de entrada que necesite "abrir
  Today en tal día" (no solo desde Calendar), replicar el mismo patrón de
  param de ruta — no el store.

## Widget de pantalla de inicio (Fase 2 del roadmap, agregado 2026-08-26)

**4 tipos de widget, no 1** (ampliado el mismo día a partir de una
referencia visual del usuario de otra app — MonAi — que mostraba varios
widgets DISTINTOS como páginas separadas en el selector "Agregar widget",
no solo tamaños distintos de uno solo): `TodayWidget` ("Hoy", lista),
`QuickAddWidget` ("Agregar rápido", estático, abre Quick Add por deep
link), `ProgressWidget` ("Progreso del día", solo el conteo grande) y
`HabitsWidget` ("Hábitos", lista de hábitos de hoy con racha/progreso
semanal). Los 4 comparten paleta/lenguaje visual (mocks previos en
`designs/trove-splash.pen`, uno por tipo, pedido explícito antes de tocar
código). `src/widget/androidWidgetTree.ts` → `WIDGET_NAMES` es el mapa
canónico de los 4 nombres, usado tanto por Android (`registerWidgetTask.ts`/
`refreshWidgets.ts`) como referenciado en los `kind` de los 4 `Widget`
Swift.

Detalle del primero (`TodayWidget`, el más completo) abajo — el resto sigue
el mismo patrón de archivos (`src/widget/<Nombre>AndroidWidget.tsx` +, si
necesita datos propios, `src/widget/<nombre>WidgetData.ts`).

- **`QuickAddWidget`**: sin datos (estático, un solo tamaño Small/2x2),
  nunca se refresca por mutaciones (`refreshWidgets` lo deja afuera a
  propósito). Tocarlo abre Quick Add directo, sin pasar por Today —
  Android usa `clickAction="OPEN_URI"` con `Linking.createURL('/',
  {queryParams:{openQuickAdd:'task'}})` (resuelve al scheme real del
  variant, nunca hardcodeado); iOS usa `.widgetURL` con el mismo query
  param pero el scheme SÍ queda hardcodeado a `dev` en
  `WidgetShared.swift` (mismo TODO que el App Group, no hay forma de
  inyectarlo sin Xcode). El deep link se escucha en `app/_layout.tsx` →
  `handleDeepLink` (`Linking.getInitialURL`/evento `url`), que llama
  `useQuickAddStore.getState().open('task')` — funciona tanto con la app
  cerrada como abierta.
- **`ProgressWidget`**: mismo `doneCount`/`totalCount` que ya calculaba el
  header de `TodayWidget` (`todayWidgetData.ts`) — no es un cálculo nuevo,
  solo un layout distinto (número grande centrado) para ese mismo dato.
- **`HabitsWidget`**: única fuente de datos nueva de verdad
  (`src/widget/habitsWidgetData.ts`) — reimplementa el mismo cálculo de
  `dayItemsStore.ts` → `loadHabitOccurrences` (hábitos programados hoy vía
  `isHabitScheduledOn`, progreso semanal y racha reales) sin depender del
  store, para poder correr también desde el headless task de Android.
  Respeta el toggle "Hábitos en Hoy" de Settings — si está apagado, el
  widget queda vacío en vez de mostrar algo que la propia app decidió no
  mostrar en Today. Mismo mecanismo de tamaño adaptable que `TodayWidget`
  del lado Android (`pickVisibleItemCount`, reusado); del lado iOS usa los
  mismos 2 tamaños que se ofrecen (Medium: 4 filas, Large: 8).
- **iOS — `WidgetShared.swift`** centraliza lo compartido entre los 4
  (paleta, `appGroup`, `TodayWidgetSharedData`/`HabitsWidgetSharedData`,
  `WidgetCountPill`) porque en Swift `private` es de alcance POR ARCHIVO,
  no por módulo — si algo necesita usarse desde otro archivo del target
  tiene que dejar de ser `private`. `MeldWidgetBundle.swift` es el único
  `@main` del target (WidgetKit exige exactamente uno por extensión),
  junta los 4 `Widget` structs (uno por archivo).

Widget "Hoy" de solo lectura (título + hasta 5 ítems de hoy con hora+título,
tocar en cualquier parte abre la app) — un tamaño único, sin pantalla de
configuración, tal como pide el spec para el plan Free. **Diseño real**
(mock previo en `designs/trove-splash.pen` → "Widget - Hoy (con items)"/
"Widget - Hoy (vacío)", pedido explícito antes de tocar código): pill
redondeada (`#2A2A2C`) para el conteo "X/Y" en vez de texto plano, un ícono
de tipo de ítem (check para task, calendario para event, mic para
voiceMemo, hoja para note, flechas para habit, cámara para moment) a la
izquierda de cada fila, y "—" (no "·") para ítems sin hora. Colores
compartidos entre Android/iOS: fondo `#1C1C1E`, texto `#FFFFFF`, dim
`#8E8E93`, acento `#FF4B66`.
- Android: los íconos son `SvgWidget` con SVGs mínimos estilo Lucide
  horneados en `src/widget/androidIcons.ts` (color fijo en el `stroke` del
  string — `SvgWidget` no soporta re-tintar en runtime como `<Icon
  color=.../>`, a diferencia del resto de la app).
- iOS: mismos tipos mapeados a SF Symbols (`checkmark.square`/`calendar`/
  `mic.fill`/`doc.text`/`repeat`/`photo`) en `TodayWidget.swift` →
  `TodayWidgetItem.sfSymbol`.
- `WidgetItemRow` (`todayWidgetData.ts`) ahora incluye `type: DayItem['type']`
  — si se agrega un tipo de `DayItem` nuevo en el futuro, agregar su ícono en
  AMBOS lados (`androidIcons.ts` y `sfSymbol` de Swift), o el ítem cae al
  ícono genérico (`circle` en iOS, sin entrada en el `Record` de Android
  rompería el tipo — TS ya obliga a cubrir los 6 casos).

### Adaptar el widget a su tamaño (bug real reportado por el usuario)

Primera versión mostraba siempre hasta 5 ítems fijos — al agrandar el widget
de Android (que se arrastra a cualquier tamaño, sin tamaños fijos como iOS)
quedaba espacio vacío abajo. Corregido con dos enfoques distintos, uno por
plataforma, porque el modelo de tamaño de cada una es realmente distinto:

- **Android — un solo widget que se adapta al tamaño real**, no varios
  widgets separados para elegir (se evaluó esa alternativa y se descartó:
  obligaría a quitar/volver a agregar el widget para cambiar de tamaño, en
  vez de simplemente arrastrarlo como ya intenta hacer el usuario).
  `androidWidgetTree.ts` → `pickVisibleItemCount(heightDp, totalDisponible)`
  calcula cuántas filas entran según el alto real que le tocó ese render
  (constantes a ojo por fila/header, documentadas en el archivo — no hace
  falta que sean exactas al pixel, solo conservadoras para no cortar una
  fila a la mitad). Ese alto llega como `WidgetInfo.height` en los dos
  lugares que renderizan el widget: `requestWidgetUpdate` (foreground, ver
  `refreshWidgets.ts` — ya lo pasaba gratis porque `renderWidget` recibe
  el `WidgetInfo` completo como argumento) y el headless task
  (`registerWidgetTask.ts`, evento `WIDGET_RESIZED` trae el tamaño nuevo).
  `todayWidgetData.ts` ahora trae hasta 12 ítems de la DB (antes 5) para que
  haya de dónde elegir si el widget es grande — el recorte real "cuántos
  entran" pasó de ser un límite fijo en la query a una decisión en
  `pickVisibleItemCount`, más cerca del render. También se agregó
  `maxResizeWidth`/`maxResizeHeight` (400dp) a la config del plugin — sin
  esto, Android permite arrastrar el widget casi a pantalla completa.
- **iOS — 3 tamaños fijos reales de WidgetKit** (`supportedFamilies`, antes
  solo `.systemMedium`): `TodayWidgetView` lee `@Environment(\.widgetFamily)`
  y ajusta `itemLimit` (Small: 1 ítem, Medium: 4, Large: 8) — acá SÍ tiene
  sentido pensarlo como "varios diseños por tamaño" porque así es como
  WidgetKit funciona de verdad (el usuario elige un tamaño fijo al agregarlo,
  no lo arrastra). Sigue sin poder compilarse/probarse en este entorno.

**`QuickAddWidget`/`ProgressWidget` (contenido fijo, sin lista) necesitaron
un fix aparte** — bug real, capturas del usuario con el FAB/la fracción
grande chicos y perdidos en una caja mucho más grande de lo esperado
(Samsung One UI le da a un widget "chico" (`targetCellWidth/Height: 2`)
celdas bastante más grandes que el mock de referencia de Pen — cada
launcher usa su propia grilla, no hay un tamaño real garantizado). Como no
hay una lista que pueda agregar más filas para llenar el espacio (a
diferencia de "Hoy"/"Hábitos"), la solución fue otra: `src/widget/
widgetScale.ts` → `widgetContentScale(width, height)` calcula un factor
según el tamaño real vs. el de referencia (172dp, el del mock), y
`QuickAddAndroidWidget`/`ProgressAndroidWidget` lo usan para agrandar el
círculo del FAB / la fracción grande en proporción — así el elemento
"hero" siempre llena la caja real, sea cual sea. Del lado iOS NO hace falta
el mismo fix: WidgetKit usa tamaños FIJOS y conocidos por familia
(`.systemSmall` ronda ~155x155pt en la mayoría de los dispositivos, no
depende de ningún launcher), así que el riesgo de "caja mucho más grande
de lo esperado" no aplica ahí.

**`widgetContentScale` extendido a "Hoy"/"Hábitos" también** (mismo día, a
pedido explícito del usuario: "¿no podemos adaptar los textos e íconos al
espacio que tenemos?"). Antes esos dos solo usaban el tamaño real para
decidir CUÁNTAS filas mostrar (`pickVisibleItemCount`), pero la tipografía/
íconos de cada fila quedaban a tamaño fijo — en un widget grande (401×226dp
real en Samsung, medido con logcat) se veían chicos y dispersos en vez de
cómodos, igual que le pasaba a `QuickAddWidget`/`ProgressWidget` antes de
ese fix. Ahora `pickVisibleItemCount` recibe también el `scale` (mismo
factor) y usa un alto de fila ESCALADO para decidir cuántas entran — van de
la mano: un widget grande no muestra más filas chicas, muestra menos filas
más grandes y legibles. `TodayAndroidWidget.tsx`/`HabitsAndroidWidget.tsx`
reciben `width`/`height` y escalan header, pill, ícono, hora/racha/
progreso, título y los gaps entre todo eso con el mismo `widgetContentScale`.

**Interactividad real en Android — marcar hecho sin abrir la app** (mismo
día, a pedido explícito del usuario: "no tiene sentido esos widgets si no
tiene funcionalidad" más allá de abrir la app). El checkbox de cada TASK en
"Hoy" y el ícono de cada fila en "Hábitos" tienen su propio `clickAction`
custom (`"TOGGLE_TASK"`/`"TOGGLE_HABIT"` + `clickActionData: {id}` — NO
confundir con los valores especiales `"OPEN_APP"`/`"OPEN_URI"` de la
librería, esos los resuelve el sistema nativo y nunca llegan a JS). El
resto del widget (fondo, título) sigue con `clickAction="OPEN_APP"` en la
raíz — Android despacha el toque a la vista clickeable más específica, así
que tocar el checkbox no dispara también el `OPEN_APP` del padre.
`registerWidgetTask.ts` ahora también maneja `widgetAction ===
'WIDGET_CLICK'`: si el `clickAction` es uno de los dos custom, llama
`widgetActions.ts` (`toggleTaskCompleteFromWidget`/
`toggleHabitCompleteFromWidget` — mismo comportamiento que
`dayItemsStore.toggleComplete`/`toggleHabitComplete`, reimplementado sin
Zustand por la misma razón que el resto del código de widget) y DESPUÉS
re-renderiza esa misma instancia con datos frescos — la fila desaparece al
instante (task completada / hábito marcado hoy ya no aparecen en
`todayWidgetData.ts`/`habitsWidgetData.ts`, mismo criterio que Today). Sin
Undo/snackbar (no hay UI del widget para mostrarlo) — tocar de nuevo en la
app es la única forma de deshacer. **Limitación conocida**: si el usuario
tiene MÁS de un widget en pantalla (p. ej. "Hoy" y "Progreso" juntos), solo
la instancia tocada se refresca al instante — el resto espera su próximo
ciclo natural (`updatePeriodMillis`, 30 min, o la próxima mutación desde la
app en foreground vía `refreshWidgets.ts`). No se implementó
"refrescar todos los widgets desde el headless al tocar uno" — quedó fuera
de alcance por ahora, evaluar si vale la pena si se pide.

**iOS sigue sin la misma interactividad** — WidgetKit soporta botones
reales dentro de un widget (`Button(intent:)` + App Intents, iOS 17+), pero
implementarlo es una pieza de trabajo aparte (definir `AppIntent`s, el
puente de recarga) y este entorno no puede compilar/probar nada de iOS de
todas formas — se dejó explícitamente sin tocar esta vuelta. Si se retoma
el lado iOS en una Mac, este es el próximo paso obvio para llegar a
paridad con Android.

**Título largo truncado en "Hoy"/"Hábitos" — NO es un bug, es tamaño real
del launcher.** Investigado con logcat real (`HoneySpace.
HoneyAppWidgetProviderInfo`/`WidgetSizeUtil`, el launcher de Samsung One
UI): el widget "Hoy" con `targetCellWidth/Height: 4x2` terminó con un
tamaño real de **401×226dp** (no algo que el código pueda forzar con
precisión — cada launcher decide el tamaño real a partir de sus propias
celdas, nuestros `minWidth`/`targetCellWidth` son solo hints). A ese ancho,
a la fila del ítem le quedan ~281dp para el título — un título largo tipo
"Este es un ejemplo para crear una tarea" (14sp) ocupa justo ese límite y
se trunca con "…", que es el comportamiento CORRECTO (una sola línea,
decisión explícita del usuario tras confirmarlo — ver la fila `truncate="END"
maxLines={1}` en `TodayAndroidWidget.tsx`/`HabitsAndroidWidget.tsx`, no
cambiarla a multilinea sin que se pida de nuevo). El wrapping en
`FlexWidget style={{flex:1}}` alrededor del `TextWidget` del título (en vez
de `width:'wrap_content'` a secas) se dejó igual porque es el patrón
correcto de Android de todas formas, pero NO fue la causa de este
truncado — no reabrir esto como bug la próxima vez que se vea un título
largo cortado, es esperado.

- **Android, real y probado en dispositivo**: `react-native-android-widget`
  (Glance/Jetpack por debajo). `src/widget/todayWidgetData.ts` (pura, sin
  React) arma los datos desde `dayItemRepository.listByDate(hoy)` — **NO**
  inyecta ocurrencias recurrentes de hábitos (mismo alcance que Calendar
  Mes/Semana, ver "Simplificaciones conocidas": un hábito solo aparece en su
  fecha de creación). `src/widget/TodayAndroidWidget.tsx` es el árbol
  `FlexWidget`/`TextWidget` con paleta fija (dark hardcodeado — el widget no
  tiene acceso a `ThemeProvider`/al acento elegido en Settings).
  `src/widget/registerWidgetTask.ts` registra el headless task
  (`WIDGET_ADDED`/`WIDGET_UPDATE`) que vuelve a consultar la DB — se importa
  desde un **entry point custom** (`index.js` en la raíz, `package.json` →
  `"main"` ahora apunta ahí en vez de `"expo-router/entry"` directo) para que
  quede registrado apenas arranca el proceso JS, sin depender de que la app
  monte ningún componente (el sistema puede lanzar el proceso solo para
  actualizar el widget con la app cerrada).
  `src/widget/refreshTodayWidget.ts` → `refreshTodayWidget()` es el punto de
  enganche desde foreground — se llama al final de `dayItemsStore.reload`/
  `toggleComplete`/`toggleHabitComplete` (+ sus Deshacer)/`remove` (+
  Deshacer)/`clearVoiceMemoAudio`, y de `inboxStore.scheduleToday`/
  `bulkScheduleToday`. Como `QuickAddSheet`/`ItemDetailSheet` ya llaman
  `dayItemsStore.reload()` al guardar, quedaron cubiertos gratis con un solo
  punto de enganche ahí. Todo el cuerpo de `refreshTodayWidget` va en un
  try/catch silencioso — nunca debe romper la mutación que lo disparó.
  **Bug real encontrado y corregido (2026-08-27)**: `registerWidgetTaskHandler`
  de la librería entrega `widgetName`/`width`/`height` ANIDADOS dentro de
  `widgetInfo` (`{ widgetInfo: { widgetName, width, height, widgetId,
  screenInfo }, widgetAction, ... }`), no como campos sueltos del payload —
  `registerWidgetTask.ts` los desestructuraba directo del nivel superior, así
  que `widgetName` llegaba siempre `undefined`, el `switch` de
  `buildAndroidWidgetTree` (`androidWidgetTree.ts`) caía siempre al `default`,
  y **los 4 widgets (Hoy/Agregar rápido/Progreso/Hábitos) renderizaban el
  contenido de "Hoy" sin importar cuál se agregara al home** — encontrado al
  agregar los 4 widgets reales al lanzador de un dispositivo (no era solo un
  problema cosmético del selector de widgets, era el widget REAL en pantalla).
  Confirmado el fix en vivo: tras corregir la desestructuración,
  "Agregar rápido" y "Progreso del día" ya renderizan su diseño propio.
  **Bug real encontrado y corregido en esta sesión**: un proceso de Metro
  viejo (corriendo desde antes de instalar la dependencia nueva) tenía el
  `node_modules` cacheado y tiraba
  `Unable to resolve module ./api/WidgetPreview` al intentar bundlear
  `react-native-android-widget` (su package.json tiene un campo
  `"react-native": "src/index"` que hace que Metro bundlee el TypeScript
  fuente de la librería, no el `lib/` ya compilado) — el archivo SÍ existe,
  era pura caché stale. Si se agrega OTRA dependencia nueva y Metro tira un
  "Unable to resolve module" de un archivo que a simple vista existe, matar
  el proceso de Metro viejo (`ss -ltnp | grep 808x` para encontrar el PID) y
  relanzar con `--clear` antes de sospechar del código.
- **iOS, agregado pero SIN VERIFICAR**: este entorno de desarrollo es Linux
  sin Xcode/macOS, así que el lado iOS nunca se pudo compilar ni ver
  funcionando (decisión explícita del usuario: agregarlo igual, a sabiendas
  de este límite). `@bacons/apple-targets` genera el target de WidgetKit —
  `targets/widget/expo-target.config.js` (App Group compartido,
  `widgetAppGroup` de `app.config.ts`, uno distinto por variant como el
  resto del aislamiento dev/test/prod) + `targets/widget/TodayWidget.swift`
  (SwiftUI, `TimelineProvider` leyendo `UserDefaults(suiteName:)` — mismas 3
  claves que escribe `refreshTodayWidget.ts` vía `ExtensionStorage`). El
  Swift tiene el App Group y el scheme de deep link **hardcodeados al
  variant `dev`** (no hay forma de inyectarlos dinámicamente por variant sin
  Xcode) — ver los comentarios `TODO` en el archivo si se retoma para
  `test`/`prod`. Antes de dar esto por terminado: abrir en una Mac
  (`npx expo prebuild -p ios --clean` + `xed ios`), confirmar que compila, y
  probar el widget en un simulador/dispositivo real — nada de esto se hizo
  todavía.

## Onboarding (Fase 2 del roadmap — reescrito completo 2026-08-28/29, pulido 2026-08-29)

Carrusel horizontal de **6 slides** + un **paso de Notificaciones fuera del
carrusel**. Se muestra UNA sola vez (`settingsStore.onboardingCompleted`,
persistido, default `false`) — nunca se resetea solo, sin fila en Ajustes para
repetirlo (decisión explícita). Para volver a verlo en dev:
`adb shell pm clear app.meld.mobile` (borra todo, incluida la bandera).

**Modo oscuro (2026-08-29, pedido explícito)**: el onboarding pasó de fondo
claro a **fondo negro plano `#121212`** (el mismo del tema oscuro de la app y
del splash), aludiendo a la marca vía el acento coral. La paleta `ONB` entera
se volteó a valores oscuros CONSERVANDO los nombres de token (`textDark` es
ahora `#F5F5F7`, `card` `#1C1C1E`, etc. — no se renombró nada para no tocar
cada archivo). `StatusBar style="light"` en `OnboardingScreen` y
`NotificationsStep`. Los mockups NO se rehicieron: ya eran capturas del tema
oscuro de la app, así que integran bien sobre el negro (antes eran
rectángulos oscuros sobre un campo claro).

**Contexto de la decisión** (el usuario pasó un artículo de "Kree8 Studio"
sobre buenos onboardings + 3 screen-recordings de referencia — REGEN /
Walkify / Anything — mirados con el skill `watch`; ver
[[project-onboarding-status]] en memoria). Alcance acordado vía
`AskUserQuestion`: **"solo mejorar lo visual/animación"** (NO se agregaron
preguntas de personalización ni activación in-onboarding — se descartó
explícitamente), 5-6 slides, mockups de shots.so + capa animada encima, y se
agregaron 2 deps nativas: `expo-haptics` (en uso) + `lottie-react-native`
(instalada pero SIN USO todavía — reservada para un confeti de cierre si se
pide). Ambas requirieron `expo prebuild --clean` + rebuild.

**Los 6 slides** (`src/features/onboarding/onboardingSlides.ts` → `SLIDES`):
1. **Bienvenida** (`kind:'welcome'`) — logo animado (rebote de escala + glow
   pulsante) + wordmark "Meld" + textos en cascada (`FadeInDown`). Botón
   "Empezar".
2. **Hoy** (`kind:'mock'`) — "Tu día, en el orden en que pasa".
3. **Hábitos** — "Hábitos que de verdad se sostienen".
4. **Momentos** — "Una foto para cada día" (era "captura de idea",
   retitulado a Momentos porque el mockup es esa pantalla; el copy pasó de
   "resume tu semana" a "cada día" el 2026-08-29 junto con el rework de
   Momentos a por-día).
5. **Calendario** — "El mes entero de un vistazo".
6. **Planes** (`kind:'plans'`) — Free vs Pro.

**Arquitectura** (`src/features/onboarding/`):
- `OnboardingScreen.tsx` — contenedor. `Animated.ScrollView` horizontal
  `pagingEnabled`; `scrollX` (shared value) vía `useAnimatedScrollHandler`;
  `page` (state) se fija en `onMomentumScrollEnd`. Chrome superior y botón
  inferior son ABSOLUTOS, no scrollean. `phase: 'slides'|'notif'`.
  **Chrome superior rediseñado 2026-08-29** (referencia visual del usuario):
  flecha **atrás** (`chevron-left`, oculta en el slide 0, hace `goTo(page-1)`)
  a la izquierda + **barra de progreso segmentada estilo "stories"** — ya NO
  son los puntos. "Saltar" salió de arriba-derecha.
  **`NotificationsStep` es un overlay `StyleSheet.absoluteFill`** sobre el
  carrusel, NO un `return` aparte (bug real: desmontar el pager perdía su
  scroll-offset y al volver con "Atrás" el slide activo quedaba EN BLANCO
  porque `scrollX` quedaba stale). Tiene su propia flecha atrás
  (`onBack` → `setPhase('slides')`).
- `onboardingTheme.ts` → `ONB` — paleta/tipografía FIJAS (oscuras desde
  2026-08-29, ver arriba: `#121212` fondo, `#FA3D5C` acento, `#F5F5F7` texto,
  `scrimClear` = `rgba(18,18,18,0)` para el gradiente inferior). NO lee
  `ThemeProvider`/`tokens.ts` (mismo criterio que `AnimatedSplash`). Todo el
  onboarding importa `ONB`, nunca tokens.
- `components/OnboardingProgress.tsx` (reemplazó a `OnboardingDots.tsx`, que
  se BORRÓ) — barra segmentada: un segmento por slide, mismo ancho repartido
  en el espacio disponible (más largos cuantas menos slides), el actual se
  rellena de izquierda a derecha siguiendo `scrollX` en vivo, los pasados
  llenos, los futuros vacíos.
- `slides/WelcomeSlide.tsx` — el glow detrás del logo es un `RadialGradient`
  de `react-native-svg` (stops 0.5/0.18/0, mismo patrón que
  `AnimatedSplash.tsx`), NO el disco plano con `borderRadius` que tenía antes.
- `components/PhoneMock.tsx` — el mockup enmarcado + un acento animado
  flotante (badge con ícono + anillo pulsante). **Desde 2026-08-29 el badge se
  CENTRA en el punto `slide.accent.x/y`** (antes anclaba su borde) y acepta
  `slide.accent.scale?` (factor, default 1; hoy ningún slide lo usa). Los
  acentos se reposicionaron sobre la acción real de cada pantalla: Today =
  checkbox de la 1ª tarea, Hábitos = cuadro de completar de una fila
  (`check-circle` en ambos, antes `flame` en Hábitos), Calendario = centrado
  en una celda de día, Momentos = sobre el botón "+" de agregar foto de la
  fila "Hoy". Mide su hueco con `onLayout`. **Dos encuadres** (`slide.framing`):
  - `'portrait'` (Hoy/Momentos/Calendario) — `width = box.width * 1.24`,
    anclado ARRIBA (`justifyContent:'flex-start'`, el header "Hoy"/"Agosto"
    queda visible), el pie sangra por detrás del botón (`overflow:hidden`).
  - `'wide'` (Hábitos) — `width = box.width * 1.35`, anclado ABAJO. Recorte
    lateral fuerte, absorbido por `overflow:hidden`.
  - **NUNCA `aspectRatio` + ancho %** — Yoga no lo resuelve con `contain`,
    deja la imagen gigante/pixelada (bug histórico, ya pasó varias veces).
    Siempre px explícitos a partir de `box` medido + `slide.ratio` (ancho/
    alto del PNG ya recortado).
  - Animaciones (solo Reanimated, sin timers sueltos): `float` continuo
    (translateY ±6), `enter` (scale 0.95→1 + rise) al volverse `active`, el
    acento pulsa con `withRepeat`.
- `slides/WelcomeSlide.tsx`, `slides/PlansSlide.tsx`, `slides/NotificationsStep.tsx`.
- Layout por slide de mock: `headerArea` (flex:1, texto centrado vertical,
  `maxWidth:280`, título 26 / subtítulo 15.5) + `mockArea` (flex:1.9). Chrome
  superior con `marginTop:30` (se bajó a pedido, estaba pegado a la barra de
  estado). `StatusBar style="light"` (fondo oscuro desde 2026-08-29).

**Mockups** (`assets/onboarding/mock-{today,habits,moments,calendar}.png`):
exports de **shots.so** que el usuario generó a partir de screenshots reales
(con el seed ampliado, ver `seed.ts`). Los 4 se recortan al bbox del canal
alfa con PIL — al reemplazar uno, recortarlo así antes de commitear (el export
crudo de shots.so trae mucho relleno transparente y `slide.ratio` está pensado
para el contenido ya recortado). `mock-moments.png` se regeneró el 2026-08-29
con el layout por-día (fila "Hoy" con `[+]` + tira de fotos), mismo recorte
893×1340. `today`/`moments`/`calendar` usan el preset "dispositivo
completo vertical" (ratio ≈ 893/1340 = 0.666); `habits` usa un recorte más
ancho (ratio ≈ 1462/1440 = 1.015) → por eso es el único `framing:'wide'`.
shots.so free solo exporta **1x/PNG** — alcanza de sobra para mostrarse a
~380dp. Los "layout presets" de shots.so dan distintos encuadres por slide
(recto / recortado / con tilt) — para las slides con capa animada encima usar
SIEMPRE preset RECTO, la perspectiva no calza con el acento.
**`assets/onboarding-today-device.png` y `assets/onboarding-today-screenshot.png`
YA NO SE USAN** (eran de la v1, una sola pantalla estática) — se pueden
borrar.

**Botón inferior**: flota sobre un `LinearGradient` scrim (`transparent → BG`)
y el mockup sangra por detrás. **Debajo del botón va un enlace de texto
"Saltar"** (movido de arriba-derecha a acá el 2026-08-29) que salta directo al
paso de Notificaciones, NO a Planes. Botón + enlace se OCULTAN en la slide de
Planes (que trae sus 2 botones propios).

**Planes** (`PlansSlide.tsx`, **rediseñada 2026-08-29** — referencia: pantalla
"Yours to try" de ThisDay que pasó el usuario): ícono real de la app
(`assets/logo.png` directo, sin tarjeta blanca) + título/subtítulo + lista
vertical de **4 features Pro** (ícono coral `favorite`/`cloud`/`sparkles`/`zap`
+ título bold + descripción dim, claves `onbPlanProF{1..4}` / `…Desc`) + botón
primario coral "Probar Pro 14 días" + botón secundario relleno "Seguir con
Free" + letra chica (`onbPlansFinePrint`) + footer "Restaurar compra ·
Términos · Privacidad" (`onbPlansRestore`/`onbPlansLegal`, HOY sin acción —
placeholders pre-RevenueCat). Se ELIMINÓ el layout viejo de dos tarjetas
Free/Pro. Los dos botones llaman
`useSettingsStore.getState().setPlan('pro'|'free')` y avanzan a Notificaciones.
**`settingsStore.plan: 'free'|'pro'` + `setPlan`** (persistidos, default
`'free'`). HOY es un flag 100% local — **sin RevenueCat ni gating real de
features** (ver "## Roadmap Pro"). El switch "Simular plan Pro" en Ajustes
(dev/test) sigue SIN existir.

**Notificaciones** (`slides/NotificationsStep.tsx`, fuera del carrusel/dots):
campana con anillos pulsantes + copy + "Activar recordatorios" →
`requestNotificationPermission()` (con try/catch) + `onDone()`; "Ahora no" →
`onDone()`. **`primeNotificationPermissionOnLaunch()` SE ELIMINÓ de `RootStack`
en `app/_layout.tsx`** — el permiso ahora se pide SOLO acá, con contexto, al
final del flujo.

**i18n**: se sacaron `onboardingTodayHeadline1/2` y `onboardingTodaySubtitle`;
se agregaron ~40 claves `onb*` (es + en) en `translations.ts` + (2026-08-29)
`onbPlanProF{1..4}Desc`, `onbPlansFinePrint`, `onbPlansRestore`,
`onbPlansLegal`, `onbBack`.

**`designs/trove-splash.pen` sigue DESACTUALIZADO** respecto al onboarding
real — el usuario pidió no tocar Pen en esta pasada. Si se retoma el diseño
ahí, rehacer las pantallas para que combinen con el código.

## Landing page (`landing/`, agregada 2026-09-23)

Web de marketing en **Next.js 16 (App Router) + Tailwind v4**, dentro de
`landing/` como proyecto npm APARTE (su propio `package.json`/`node_modules`
— no es un workspace). `metro.config.js` de la raíz la excluye con
`resolver.blockList` y el `tsconfig.json` raíz tiene `"exclude": ["landing"]`
— sin eso Metro rastrea sus ~400 paquetes y `tsc` de Expo intenta chequear
código de Next. Diseño = dirección **A+** del canvas de mockups (ver memoria
`project-landing-page`): oscuro de marca, bilingüe `/es` + `/en`, CTA = lista
de espera, Pro como "Próximamente". Detalle de estructura y pendientes en
`landing/README.md`. **Esta versión de Next tiene cambios de API** (p. ej.
`proxy.ts` en vez de `middleware.ts`, `params` como Promise) — leer
`landing/node_modules/next/dist/docs/` antes de tocar código (lo pide
`landing/AGENTS.md`). La portada tiene la pantalla Hoy funcionando en el navegador
(`landing/src/demo/`, estado solo en memoria) — usa una COPIA de
`src/domain/voiceParser.ts` (`landing/src/demo/voiceParser.ts`): si se cambia
el parser en la app, copiar el cambio allá. La lista de espera guarda en **Resend** (contactos) vía
`RESEND_API_KEY` — sin esa variable, en producción responde 503 a propósito. Desplegada en Vercel
(proyecto `meld`, `usemeld.vercel.app`), conectada a `JhonnyXT/meld-app`
(GitHub) con `Root Directory: landing` — cada push a `main` construye y
despliega solo. Detalle completo (dominio, variables de entorno, gotchas
de la conexión Git↔Vercel) en `landing/README.md`.

## Roadmap Pro

Todo lo que el código ya deja preparado/anotado para el plan Pro pero
todavía NO está implementado, en un solo lugar — antes repartido entre
comentarios sueltos de código y `CLAUDE.md`. El spec completo de negocio
(nombre, Free vs. Pro final, precio/trial, marketing — ver artifact "Meld —
Spec de Desarrollo", actualizado 2026-08-27 en la sesión de consulta de
producto) tiene más alcance del que hay documentado acá; esta sección solo
cubre lo que ya tiene ganchos concretos en el código de HOY, no todo el
tier Pro. **El tier Pro final es más grande que lo que dice el resto de
este archivo** (que documenta solo Auto-registro con detalle técnico real):
además de salud/colaborativo/fitness/personalización visual, Pro incluye
backup y sync en la nube multi-dispositivo, sync bidireccional con Google
Calendar/Outlook, Quick Add en lenguaje natural, temporizador Pomodoro,
widgets avanzados + Live Activities (el widget BÁSICO de una lista simple
sí es gratis), y funciones con IA (resumen del día, sugerencias de
horario) — la mayoría no tiene código ni gancho todavía, son puramente
de la consulta de negocio, ver el artifact para el detalle completo de
cada uno.

**Quick Add en lenguaje natural — la versión BÁSICA offline ya está
construida y es GRATIS** (2026-09-02, ver "Agregar por voz / texto" en
Interacciones no obvias): `domain/voiceParser.ts` parsea una frase dictada/
escrita con keyword-matching (es+en, un ítem) y pre-llena Quick Add. Lo que
queda como Pro es la versión con IA: multi-ítem en una frase, más precisa,
y probablemente NL escrito además del dictado. No gatear la versión offline
por `plan` — decisión explícita del usuario ("disponible para todos").

- **Auto-registro real (Health/Fit conectado)** — el ítem con más detalle
  hasta ahora. Hoy, elegir una métrica en el modal de Auto-registro
  (`AutoTrackModal`, ver "Auto-registro real" más arriba) solo cambia el
  ícono/agrupamiento visual del hábito — el check de "hecho" sigue siendo
  100% manual siempre, para CUALQUIER hábito, tenga o no Auto-registro. La
  función real de plan Pro (todavía sin construir): con Apple Health/Google
  Fit conectados, ese check se marcaría solo apenas la app detecte que se
  cumplió la meta ahí (lectura on-device, read-only) — el check manual
  seguiría existiendo igual, para poder corregir a mano aunque Health diga
  otra cosa. Las 3 anotaciones de esto en el código: `Habit.autoTrack`
  (comentario largo en `domain/dayItem.ts`), el texto `autoTrackProNote`
  que el usuario ve en el modal (`i18n/translations.ts`), y este párrafo.
  Si se implementa en el futuro, tocaría: un módulo nativo o SDK de
  HealthKit/Health Connect, lectura periódica en background, y que esa
  lectura llame a lo mismo que hoy llama
  `dayItemsStore.toggleHabitComplete` cuando detecte la meta cumplida — no
  un mecanismo paralelo.
- **Monetización (RevenueCat) y el resto del tier Pro** (salud/
  colaborativo/fitness, widgets, Live Activities, versión de escritorio) —
  mencionados en el spec original. **Gancho parcial desde 2026-08-28**: la
  slide de Planes del onboarding ya escribe `settingsStore.plan:
  'free'|'pro'` (persistido, ver "## Onboarding"), pero es un flag 100%
  local — NO hay RevenueCat instalado, NI paywall real, NI gating de
  ninguna feature por `plan` todavía. Falta también el switch "Simular plan
  Pro" en Ajustes (dev/test) para probar el gating cuando exista. Antes de
  empezar cualquiera de estos, releer el artifact del spec — esta sección
  de `CLAUDE.md` no reemplaza esa fuente, solo evita perder de vista lo que
  ya tiene código real esperando (Auto-registro, arriba).

## Simplificaciones conocidas (documentadas, no bugs)

- **Ya resuelto (no repetirlo)**: el heatmap de hábitos en Calendar (vista
  Year) usaba un hash determinístico como placeholder visual — ahora usa
  historial real (`habit_completions`, ver "Hábitos recurrentes y tracking
  real" más abajo).
- Los hábitos NO recurren automáticamente en Calendar Mes ni en la agenda
  Semana — ahí una Habit sigue mostrándose solo en su fecha de creación
  (columna `date` de `day_items`), igual que un Task. La recurrencia
  (`isHabitScheduledOn`) y el tap-to-complete (`onToggleHabitComplete`) solo
  están cableados en Today y en el heatmap de Año — decisión explícita de
  alcance al construir la feature (2026-08-20), no un descuido. Extenderlo a
  Mes/Semana implicaría que `useWeekAgenda`/el query de `listByDateRange` de
  `CalendarScreen` también inyecten ocurrencias recurrentes, igual que
  `dayItemsStore.reload` — evaluar si vale la pena antes de asumir que ya
  funciona ahí.
- Ya resuelto (no repetirlo como si fuera pendiente): "Time"/"Remind me" en Task/
  Event/VoiceMemo/Note, el campo Fecha/Día y la Duración de Event usan
  wheel-picker/calendario libres (`TimeFieldRow`/`DateFieldRow`/
  `DurationFieldRow`), no ciclos de presets. `DurationFieldRow` abre
  `durationPicker/DurationPickerModal` (wheel de horas 0-4 + minutos en pasos
  de 15, sin AM/PM porque es un lapso, no una hora del día) y trabaja siempre
  en minutos totales (`eventDurationMinutes`), igual que el resto del dominio
  de horas — reemplazó el viejo ciclo de presets fijos ('30 min'/'1 hr'/
  '1.5 hr'/'2 hr'). Lo que SÍ sigue siendo ciclo de presets fijos
  (`PresetFieldRow`, a propósito — no son horas reales ni lapsos): Repetir y
  Alerta previa de Event, Hora preferida y Auto-track de Habit.
- `Event` no soporta eventos multi-día (el dominio solo tiene `startTime`/`endTime`
  del mismo día) — la barra morada de evento multi-día del mock de Calendar Month
  no está implementada a propósito.
- **`FlashList` (requisito no funcional del spec, "listas largas fluidas") solo
  se usa en `InboxScreen`** — es la única lista realmente no acotada (backlog
  GTD, puede crecer sin límite). Today (un solo día), la agenda Semana de
  Calendar (7 días) y Moments (últimos ~90 días agrupados por día) siguen con
  `ScrollView` a propósito, decisión explícita del usuario (2026-08-20): son listas
  naturalmente acotadas donde `FlashList` no aporta rendimiento real, y en
  Today además migrar rompería las animaciones Reanimated
  (`FadeIn`/`FadeOut`/`LinearTransition`) por fila que dan la UX de "tarea
  completada desaparece con Undo"/"hábito de salud se oculta al marcarse" —
  el reciclado de vistas de `FlashList` no es compatible de forma confiable
  con animaciones de salida por ítem. No convertir estas 3 pantallas a
  `FlashList` sin que se pida explícitamente de nuevo.
- Moments guarda la URI que entrega `expo-image-picker` directamente, sin copiarla
  a almacenamiento propio de la app todavía.
- **Momentos es por DÍA, no por semana** (cambiado 2026-08-29 a pedido
  explícito — antes era una foto por semana, `Moment.weekOfYear` como clave).
  Ahora: varias fotos por día permitidas (id único por foto en
  `pickMomentPhotoForToday`), `MomentsScreen` agrupa por `date` y ordena los
  días de más reciente a más antiguo, cada día es un `MomentsDayRow`
  (encabezado con fecha + tira horizontal de fotos). El botón "+" va a la
  IZQUIERDA de la tira y SOLO aparece en el día de hoy (`canAdd`) —
  `pickMomentPhotoForToday()` siempre guarda con `date` = hoy. `weekOfYear`
  sigue existiendo como columna/campo (se calcula al crear) pero ya no se usa
  para agrupar. `MomentsWeekRow`/`MomentsCollapsedWeekRow` y `recentWeeks` de
  Moments se eliminaron. **Los Momentos ya NO aparecen en la lista de Today
  (`TodayScreen` → `visibleRows` filtra `type !== 'moment'`) ni en la agenda
  Semana de Calendar (`WeekAgendaView`)** — tienen su pantalla propia y con
  `date` = hoy ensuciaban el timeline con filas "Momento YYYY-MM-DD". El
  contador "X de Y hechos" de `DayBar` usa `countableItems` (sin moments) para
  no inflar el total. Siguen contando para la miniatura del grid de Mes
  (`MonthDayCell`) y para los stats de `CalendarTodayCard`. Tocar una foto la
  abre a pantalla completa
  (`components/moments/MomentPhotoViewer.tsx` — `Modal` transparente
  `statusBarTranslucent`, fondo `#000`, imagen `resizeMode="contain"`, tocar
  en cualquier parte o el botón "X" cierra; sin zoom por gesto todavía —
  necesitaría una lib aparte).

## Gotchas del entorno (no repetir la investigación)

- Este entorno corre otro proyecto Expo (`my-wallet-app`) con Metro en el puerto
  8081 permanentemente — nunca matarlo, usar otro puerto (`--port 8082` en
  adelante) y `adb reverse tcp:8081 tcp:<puerto>` para que el celular conecte igual
  por USB en el puerto nativo esperado.
- `adb` en este sandbox pierde el daemon entre invocaciones de shell separadas —
  hay que levantar `adb nodaemon server -a` en foreground dentro de la MISMA
  invocación de Bash que los comandos que lo usan. Detalle completo en el skill de
  build.
- Reanimated 4.x necesita `react-native-worklets` como dependencia explícita (no
  viene incluido) y `babel-preset-expo` debe estar en el `node_modules` raíz (no
  alcanza con el que trae `expo` anidado) para que `babel.config.js` lo resuelva.
- **Un `Gesture.Pan`/`GestureDetector` de `react-native-gesture-handler` dentro
  de un `<Modal>` de React Native NO reconoce toques en Android** — el
  `GestureHandlerRootView` de la raíz de la app (`app/_layout.tsx`) no cubre la
  ventana nativa separada que `Modal` crea. Encontrado real al agregar el
  arrastre de `TypeTabs` dentro de `QuickAddSheet`/`ItemDetailSheet` (ambos son
  `<Modal>`): el gesto simplemente no disparaba nada, sin error ni warning.
  Fix: envolver el contenido del `Modal` en su PROPIO `GestureHandlerRootView`
  (`style={{flex:1}}`), uno por cada `Modal` que use gestos — ya aplicado en
  esos dos archivos (y desde 2026-09-11 también en `CategoryFormModal.tsx`, que
  suma su propio drag-to-dismiss — ver "Interacciones no obvias"). Si se agrega
  un gesto nuevo dentro de OTRO `Modal` (`DatePickerModal`, `TimePickerModal`,
  `DurationPickerModal`, `RemindersSheet`, `AutoTrackModal`,
  `CalendarFilterSheet`, etc.) y "no pasa nada" al tocar/arrastrar, revisar esto
  primero antes de sospechar del gesto
  en sí.
- **Reanimated: nunca llamar desde un worklet (`onBegin`/`onUpdate`/etc. de un
  gesto) a una función JS intermedia que no esté marcada como worklet** —
  revienta en runtime con "[Worklets] Tried to synchronously call a Remote
  Function" (mensaje real visto al extraer un cálculo de índice a una función
  aparte en `TypeTabs.tsx`). El cálculo tiene que ir inline dentro del propio
  callback del gesto; solo la función final que toca estado de React
  (`setState`/prop callback) debe pasar por `runOnJS(...)`.
- El tema por defecto es `'system'` (no `'dark'`), así que en el celular del
  usuario puede aparecer en claro según el modo del sistema — es esperado, no un
  bug; la paleta clara de `tokens.ts` también está en uso real, no solo la oscura.
- **Falso positivo real: pantalla gris/negra sólida justo después de relanzar la
  app NO es un bug — es Metro todavía bundleando/el device todavía pintando.**
  En el Moto E7 Plus, un bundle en frío (`expo start --clear`, ~4100 módulos)
  tarda 13-15s en compilar del lado de Metro, y el device necesita otros
  10-20s más para bajarlo por USB, ejecutarlo y pintar el primer frame — un
  `sleep 10`/`sleep 15` entre relanzar y capturar pantalla NO alcanza y da un
  falso "se rompió todo". Confirmar con `adb logcat -d | grep "ReactNativeJS:
  Running"` que el JS arrancó, y recién ahí esperar ~15-20s más antes de
  capturar/diagnosticar — no asumir un bug real (Fabric, Reanimated, una
  dependencia nueva, etc.) sin haber esperado ese tiempo primero. Los
  warnings `Reanimated: ... RetryableMountingLayerException: Unable to find
  SurfaceMountingManager` que aparecen en el log durante el arranque son
  ruido no-fatal de esta ventana de carga, no la causa del problema.

## Verificación en dispositivo — no abusar de los ciclos yo solo

El usuario pidió explícitamente frenar los loops largos de "yo toco todo con adb y
saco captura tras captura" porque consume mucho token. Después de una tanda inicial
razonable de verificación propia (compilar, instalar, un par de screenshots para
confirmar que no rompió nada), **entregarle al usuario una lista corta de pasos
concretos para que pruebe él mismo** en el celular y reporte qué ve, en vez de
seguir manejando el dispositivo por muchos turnos. Sí vale la pena seguir
recompilando/reinstalando cuando cambia el código — lo que hay que cortar es la
exploración manual turno a turno vía `adb shell input tap/swipe` + screenshot.
