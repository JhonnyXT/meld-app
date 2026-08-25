@AGENTS.md

# Trove

Planificador diario en Expo/React Native (iOS + Android) que reúne tareas, eventos,
hábitos, notas, notas de voz y fotos en una vista por día. Ver el spec de producto
completo en el artifact "Trove — Spec de Desarrollo" (Claude, publicado por el dueño
del proyecto — pedirle el link si hace falta releerlo). El proyecto se llamó "Anchor"
hasta el 2026-08-21, cuando se renombró a "Trove" (mismo producto, mismo spec —
solo cambió el nombre/logo/lema, no la arquitectura ni el roadmap).

## Stack

- Expo SDK 57 (managed, New Architecture), Expo Router, TypeScript estricto.
- Estado: Zustand (un store por feature en `src/store`, sin un store global).
- Datos: SQLite on-device vía `expo-sqlite` + Drizzle ORM. Sin backend — todo el plan
  Free es local-first (ver sección "Modelo de datos").
- Gestos/animación: `react-native-gesture-handler` + `react-native-reanimated` 4.x
  (requiere `react-native-worklets` como dependencia explícita — ver Gotchas).
- Audio: `expo-audio` (grabación y reproducción reales, no mocks).
- Filesystem: `expo-file-system` (API nueva `File`/`Directory`, no la legacy) —
  se usa para borrar el archivo físico de audio de una nota de voz.
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
`name`/`package`/`scheme`/`iconBackground` por variant, seleccionado con la env var
`APP_VARIANT` (`dev` por defecto si no se define). Un `APP_VARIANT` desconocido **lanza
excepción** al resolver la config, no hay fallback silencioso.

| Variant | `applicationId` | Para qué | Cómo se construye |
|---|---|---|---|
| `dev` | `app.trove.mobile` | Iterar día a día, Metro + hot reload | Local, `npm run build:dev` (`assembleDebug`) |
| `test` | `app.trove.mobile.test` | Probar un build "limpio" sin Metro, sin cable | Local, `npm run build:test` (`assembleRelease`) |
| `prod` | `app.trove` | La versión final para las stores | Solo EAS, `npm run eas:prod` — nunca local |

Los IDs de paquete eran `app.anchor.*` hasta el rebranding a Trove (2026-08-21) — se
migraron a `app.trove.*` a propósito, sabiendo que eso reinstala como app nueva en
cualquier dispositivo con la versión vieja instalada.

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
keystore de producción real por su cuenta. **Todavía no se corrió `eas login`/
`eas build:configure` en este proyecto** (no hay `extra.eas.projectId` en `app.config.ts`
ni cuenta de Expo vinculada) — `npm run eas:prod` va a pedir configurarlo la primera vez
que se use; no ejecutar sin que el usuario lo pida explícitamente, es la última pieza del
proceso de release.

## Arquitectura de carpetas

```
/app                    → rutas (Expo Router). Grupo (tabs) sin tab bar nativa real:
                           la navegación es el popup "Navigate" (NavigateMenu), no
                           Tabs de Expo Router — ver "Navegación" abajo.
/src
  /domain                → tipos y lógica pura, sin dependencias de RN
    dayItem.ts            → DayItem y subtipos (el modelo central, ver abajo)
    date.ts, time.ts       → helpers de fecha/hora (todo en minutos-desde-medianoche
                              o "HH:MM" 24h para persistir; formato humano solo al
                              renderizar)
    week.ts                → semana ISO-8601 (Moments, Calendar semana — `getWeekRange`)
    calendarGrid.ts,
    calendarHeatmap.ts     → grilla de mes / heatmap de año (Calendar) — el heatmap
                              alinea el día 1 a su columna real de semana (offset
                              lunes-primero, mismo cálculo que `calendarGrid.ts`)
    quickAdd.ts             → constantes y helpers compartidos entre Quick Add y el
                              detalle de ítem (listas de presets, conversión
                              label↔hora, frecuencia de hábito)
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
    seed.ts                 → datos de ejemplo que reproducen los mocks de Stitch,
                              solo se insertan si la tabla está vacía
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
                              hoy") e Inbox ("Tu Bandeja de entrada está vacía"),
                              ambos invitan a usar "+" o la Bandeja. Se renderiza
                              dentro de un contenedor con `flex:1`/`flexGrow:1`
                              para quedar centrado en toda el área visible de la
                              pantalla (no solo pegado arriba) — al agregarlo a
                              una lista nueva, dar `flexGrow:1` al
                              `contentContainerStyle` del `ScrollView` padre.
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
    calendar/CalendarViewSwitch.tsx → switch de 3 íconos (Mes/Semana/Año) en el
                              header de Calendar, reemplaza el viejo
                              `SegmentedToggle` de texto
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
                              próximos, filtro de Calendario)
  /theme                    → tokens.ts (paleta, tipografía) + ThemeProvider
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
  (toDomain/toRow).
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
    controla Android/iOS, la app no puede revocarlo por su cuenta.
    `primeNotificationPermissionOnLaunch()` se llama una vez al arrancar
    (`app/_layout.tsx` → `RootStack`): si el usuario nunca respondió
    (`status === 'undetermined'`), dispara el diálogo nativo ahí mismo, sin
    esperar a que intente poner un recordatorio; si ya está `granted` no hace
    nada (silencioso); si ya lo rechazó antes, tampoco insiste en cada
    arranque.
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
- **Marcar un hábito "de salud" lo saca de la lista de Today** (agregado
  2026-08-20, a pedido explícito, mismo patrón que Task —
  `TodayScreen.tsx` → `visibleRows` filtra `colorStyle: 'cool'` +
  `habitCompletedMap[id]`), con snackbar de Deshacer
  (`dayItemsStore.toggleHabitComplete`, texto `habitCompleted`) igual que
  `toggleComplete` de Task — sin esto, marcar y esconder sin salida rápida
  sería una trampa de UX. **Los hábitos manuales (`colorStyle: 'default'`)
  NO desaparecen al marcarse** — a propósito, es una diferencia real entre
  ambos estilos de hábito, no un descuido; el registro sigue intacto en
  `habit_completions` de cualquier forma (se borra al deshacer, no al
  ocultarse) y el heatmap de Año lo sigue contando esté o no visible en
  Today — marcar/ocultar es puramente de renderizado, la fuente de verdad
  para Calendar nunca se toca.

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
  (`TopAppBar`, y los headers ad-hoc de Calendar/Settings/Moments/Inbox) lleva
  `lineHeight: 36` explícito.** Sin esto, la fuente (Plus Jakarta Sans
  ExtraBold) deja un leading grande debajo del glifo que separaba demasiado el
  subtítulo del título — comparado contra una captura de referencia, el hueco
  título→subtítulo era ~3x más grande que el de la referencia. Si se agrega un
  header nuevo con este mismo patrón de título grande, replicar el
  `lineHeight: 36` o va a volver a verse separado de más.
- **Today tiene un fondo con degradado sutil SOLO EN MODO OSCURO**
  (`components/AuraBackground.tsx`) en vez del `palette.bg` plano del resto
  de pantallas. Es una aproximación liviana de un fondo con capas de
  gradiente + blend modes CSS (`react-native-svg` `RadialGradient` +
  `expo-linear-gradient`, sin blend modes reales — RN no los tiene nativos;
  ver el comentario del componente para el detalle y por qué se descartó
  `react-native-skia`). Se monta vía la prop `background` de
  `components/Screen.tsx`, pero `TodayScreen.tsx` solo se la pasa cuando
  `useTheme().scheme === 'dark'` (`background={scheme === 'dark' ?
  <AuraBackground /> : undefined}`) — en claro cae al `palette.bg` blanco
  plano de siempre, sin degradado. **Decisión explícita del usuario, no un
  bug**: se probó adaptar los colores a claro (opacidades bajadas a la
  mitad) y funcionaba bien, pero prefirió dejarlo exclusivo de oscuro — si
  se pide volver a adaptarlo a claro, `AuraBackground.tsx` ya no tiene esa
  rama de código (se sacó al simplificar), hay que rehacerla.
  - **`variant="abyssal-floor"` (default) es la activa** en `TodayScreen.tsx`
    hoy — glow teal/cian asomando desde el borde inferior.
  - **`variant="nightfall"` quedó guardada** (no se usa en ninguna pantalla
    ahora mismo, pero no se borró) — al usuario le gustaron varias. Si se
    pide volver a activarla, es pasarle esa prop a `<AuraBackground>` en
    `TodayScreen.tsx`, el código ya está.
  - Se probaron y **descartaron del todo** otras 5 variantes en vivo en
    Today (Aurora Beams, Smoke, Carbon Glass, Phantom Arc, Dew) — no
    reintroducirlas sin que las vuelvan a pedir explícitamente.
  - Solo Today tiene este fondo; el resto de pantallas sigue con
    `palette.bg` plano.

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
  Mientras hay un arrastre de hora activo, es **una sola card continua** que se
  estira hacia arriba (fila de confirmación de hora + divisor + fila
  menú/centro/FAB) — no dos pastillas separadas por un hueco; si se toca esto,
  mantener un solo `View` con `borderRadius`/sombra/borde y un divisor `height:1`
  entre las dos filas internas, replicando el video/mock de referencia del
  usuario.
- Acciones destructivas (eliminar un ítem) usan `ConfirmDialog`
  (`components/ConfirmDialog.tsx`), nunca `Alert.alert` nativo — el modal propio
  respeta paleta/tipografía del design system en claro y oscuro.
- La categoría (`category`/`categoryColor`) de un ítem ya NO se muestra como
  trailing pill en las filas de Today (`mapDayItemToRow.ts` → `trailingFor` no la
  incluye) — solo es visible/editable dentro de `ItemDetailSheet`. Si se pide
  mostrarla de nuevo en la lista, es una reversión explícita, no un bug a
  "arreglar".

## Logo y splash screen

Rebranding Anchor → Trove (2026-08-21, ver más arriba). El logo (`assets/logo.png`,
copiado también a `icon.png`/`android-icon-foreground.png`/`splash-icon.png` — las 4
son el mismo archivo, no hay symlink) sigue en iteración — un círculo con un
checkmark integrado en su propio contorno, degradado blanco→coral `#FF4B66`. Todavía
tiene pendiente el mismo problema que otras direcciones descartadas antes de
llegar a esta (ver historial completo en memoria de sesión, no en este archivo):
el fondo del archivo fuente sale blanco en vez de negro sólido, y el check es un
trazo superpuesto en vez de estar recortado del propio círculo — no darlo por
definitivo sin confirmar con el usuario.

### Splash animado (`src/components/AnimatedSplash.tsx`)

Reemplaza al splash nativo estático (mismo logo/fondo, configurado en
`app.config.ts` → plugin `expo-splash-screen`) apenas React puede pintar.
Coreografía: ícono con rebote sutil de escala, glow ambiental (`RadialGradient`
real de `react-native-svg`, mismo patrón que `AuraBackground.tsx`) pulsando
detrás, wordmark "Trove" y lema ("Todo tu día. Una sola app.", clave `appTagline`
en `i18n/translations.ts`) entrando en cascada — y como salida, el MISMO nodo del
glow (no uno duplicado) se expande con `Easing.in` hasta cubrir toda la pantalla
mientras el resto se apaga, y ahí corta directo a Today. Total ~1.9s.

Se armó primero un mock de referencia en pen.dev (`designs/trove-splash.pen` — ver
"pen.dev Design" en las skills disponibles para cómo generar/editar diseños ahí)
antes de llevarlo al código real.

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
(`FloatingBar`/`DayBar`) con un botón "☰" que abre `NavigateMenu` (popup modal con
los 5 destinos). El layout de `(tabs)/_layout.tsx` es un `Stack` sin header, no un
`Tabs` — si se reintroduce `Tabs` de Expo Router, se vuelve a duplicar la
navegación (ya pasó una vez, el usuario lo marcó como bug).

Orden de destinos en `NavigateMenu.tsx` (`DESTINATIONS`), a pedido explícito del
usuario: **Hoy, Bandeja, Calendario, Momentos, Ajustes** — no es alfabético ni el
orden en que se construyeron las pantallas, no "corregirlo" a otro orden sin que
se pida.

## Interacciones no obvias

- **Quick Add** (`components/quickAdd/QuickAddSheet.tsx`): hoja global montada en
  `app/_layout.tsx`, se abre con `useQuickAddStore.getState().open(type)` desde el
  FAB de cualquier pantalla. Task **no tiene campo "Hora" propio** — solo
  "Recordarme" (`TimeFieldRow`, `taskReminderMinutes: number | null`); a
  diferencia de la primera versión de este flujo, **"Recordarme" en Apagado ya
  no manda el ítem al Inbox** — Task y Voice Memo creados desde Quick Add
  siempre quedan agendados para Hoy (`date: todayKey`, `status: 'scheduled'`),
  tengan o no recordatorio, igual que Event/Note/Habit (consistencia entre los
  6 tipos: el botón "+" es global, no un capturador de Inbox — ese ya existe
  aparte, en el campo dedicado de `InboxScreen`). Un recordatorio con hora
  además dispara la notificación (ver "Modelo de datos"). Los demás tipos con
  "Recordarme" (Event/VoiceMemo/Note) funcionan igual respecto al propio campo:
  `null` = apagado (sin notificación), un número (o el sentinel
  `ANY_TIME_MINUTES`) = con recordatorio. Nota de voz requiere grabación real
  (`useVoiceRecorder`) antes de poder guardar. Para mandar algo al Inbox desde
  cero, usar el campo de captura rápida de `InboxScreen` — la única vía a
  Inbox sin fecha explícita desde Quick Add es reclasificar/editar el ítem
  después vía `ItemDetailSheet` (que sí tiene `DateFieldRow` y permite vaciar
  la fecha).
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
- **Eliminar un ítem (swipe)**: en Today, Inbox y la agenda Semana de Calendar,
  deslizar una fila a la izquierda revela un botón rojo de eliminar a la derecha
  (`SwipeToDeleteCard`, gesto propio con `react-native-gesture-handler` +
  Reanimated, mismo patrón que el proyecto hermano "my-wallet-app" pero
  reimplementado sin `Animated`/`PanResponder`). Tocar el botón borra **directo,
  sin confirmar antes** — `dayItemsStore.remove` / `inboxStore.remove` /
  `useWeekAgenda().remove`, los tres cancelan la notificación pendiente y
  muestran la fila de Undo (`useUndoStore` + `UndoRow` en
  `components/FloatingBar.tsx`) por 4s (`UNDO_DURATION_MS`, exportado desde
  `undoStore.ts`). **No es una card flotando aparte** — `FloatingBar` se estira
  hacia arriba para mostrarla, exactamente el mismo mecanismo que
  `TimeConfirmRow` durante el arrastre de hora (`dragging ? <TimeConfirmRow/>
  : undoVisible ? <UndoRow/> : null`, mutuamente excluyentes, un solo `View`
  con el mismo fondo/borde/radio + divisor entre filas) — así el contenido de
  la lista de atrás sigue visible en vez de quedar tapado por una card
  flotando encima con su propio hueco/sombra (pedido explícito del usuario,
  con una captura de referencia mostrando el mismo patrón que
  `TimeConfirmRow`). Anillo de progreso a la izquierda (`react-native-svg`
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
  modal (mismo patrón visual que `NavigateMenu`) con los ítems que tengan
  `reminderAt` desde el instante actual en adelante (`listUpcomingReminders`,
  incluye el sentinel `ANY_TIME_HHMM`/Any Time), ordenados cronológicamente. Si aparece
  vacío no es un bug — es que ya pasó la hora de todos los recordatorios de hoy;
  confirmar la hora actual del dispositivo antes de asumir que algo está roto.
- **Filtro de Calendario** (`store/calendarFilterStore.ts` +
  `components/calendar/CalendarFilterBar.tsx`/`CalendarFilterSheet.tsx`): pill
  flotante anclada arriba de `FloatingBar` (suma la altura extra de
  `TimeConfirmRow` cuando hay un arrastre de hora activo — si no, queda tapada
  por esa fila, bug real ya corregido). La hoja lista "Todo" + un tipo por fila
  (Tasks/Events/Notes/Voice notes/Moments) + una sección "HÁBITOS" con un ítem
  por cada hábito EXISTENTE en la DB por título (`listDistinctHabitTitles`, no
  un genérico "Habit") — filtrar por un hábito específico filtra por
  `type === 'habit' && title === X`, no por tipo. El filtro aplica a los dots del
  grid mensual, a las etiquetas mini del grid mensual y a la agenda semanal; NO
  afecta el heatmap de Año porque ese heatmap ya es un placeholder sintético (ver
  "Simplificaciones conocidas") — filtrar data falsa no tendría sentido. El ícono
  de embudo (`filter-list`) de la pill solo se muestra para la selección actual
  cuando el filtro es un tipo/hábito específico — si el filtro es "Todo"
  (`kind: 'everything'`) NO se repite el ícono de embudo una segunda vez junto a
  "Todo" (`currentIcon` queda `null` en ese caso); mostrarlo ahí era un bug real
  ya corregido (pill se veía "⧩ Filtro | ⧩ Todo").
- **3 vistas de Calendario** (`CalendarViewSwitch`, orden Mes/Semana/Año):
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
  ese día) e Inbox (sin ítems pendientes) muestran el mismo componente —
  ícono flotante + título + mensaje que invita a usar el FAB "+" o la Bandeja.
  NO se agregó a Calendar Mes/Año (son grillas, no listas — siempre muestran su
  estructura aunque no haya ítems) ni a la agenda semanal de Calendar (ya tenía
  su propio mensaje corto "Sin ítems" por día, en `WeekAgendaView`, que es
  suficiente ahí y se dejó como estaba).

## Roadmap Pro

Todo lo que el código ya deja preparado/anotado para el plan Pro pero
todavía NO está implementado, en un solo lugar — antes repartido entre
comentarios sueltos de código y `CLAUDE.md`. El spec completo del plan Pro
(salud, colaborativo, fitness — ver artifact "Trove — Spec de Desarrollo")
tiene más alcance del que hay documentado acá; esta sección solo cubre lo
que ya tiene ganchos concretos en el código de HOY, no todo el tier Pro.

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
  mencionados en el spec original, sin ganchos de código todavía (ni
  paywall, ni gating de features, ni RevenueCat instalado). Antes de
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
  Calendar (7 días) y Moments (52 semanas fijas) siguen con `ScrollView` a
  propósito, decisión explícita del usuario (2026-08-20): son listas
  naturalmente acotadas donde `FlashList` no aporta rendimiento real, y en
  Today además migrar rompería las animaciones Reanimated
  (`FadeIn`/`FadeOut`/`LinearTransition`) por fila que dan la UX de "tarea
  completada desaparece con Undo"/"hábito de salud se oculta al marcarse" —
  el reciclado de vistas de `FlashList` no es compatible de forma confiable
  con animaciones de salida por ítem. No convertir estas 3 pantallas a
  `FlashList` sin que se pida explícitamente de nuevo.
- Moments guarda la URI que entrega `expo-image-picker` directamente, sin copiarla
  a almacenamiento propio de la app todavía.

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
