@AGENTS.md

# Meld

Planificador diario en Expo/React Native (iOS + Android) que reúne tareas, eventos,
hábitos, notas, notas de voz y fotos en una vista por día. El spec de producto
completo está en el artifact "Meld — Spec de Desarrollo" (publicado por el dueño del
proyecto — pedirle el link si hace falta releerlo). El proyecto se llamó "Anchor" y
luego "Trove" antes de **Meld** (nombre definitivo); por eso quedan rastros como
`app.anchor.*` en data vieja. La carpeta local del repo se llamó `anchor-app`
hasta que se renombró a `meld-app`.

Este archivo contiene solo las reglas vigentes y su razón. El historial de
decisiones (qué se probó, qué se descartó, cuándo y a pedido de quién) está en
`docs/decisions.md` — consultarlo antes de revertir una decisión cuyo porqué no
esté claro acá.

## Stack

- Expo SDK 57 (managed, New Architecture), Expo Router, TypeScript estricto.
- Estado: Zustand (un store por feature en `src/store`, sin un store global).
- Datos: SQLite on-device vía `expo-sqlite` + Drizzle ORM. Sin backend — el plan
  Free es local-first.
- Gestos/animación: `react-native-gesture-handler` + `react-native-reanimated` 4.x
  (requiere `react-native-worklets` como dependencia explícita — ver Gotchas).
- Hápticos: `expo-haptics`.
- `lottie-react-native`: instalado pero **sin uso**, reservado para animaciones
  del onboarding (p. ej. un confeti de cierre). Si sigue sin usarse, evaluar sacarlo.
- Audio: `expo-audio` (grabación y reproducción reales).
- Dictado por voz: `expo-speech-recognition` (dependencia nativa de terceros,
  ver `src/hooks/useVoiceDictation.ts`). Devuelve TEXTO reconocido en vivo, no un
  archivo de audio.
- Filesystem: `expo-file-system` (API nueva `File`/`Directory`/`Paths`, no la legacy).
- Íconos: `lucide-react-native` + `react-native-svg` — **no `@expo/vector-icons`
  directo**, ver "Sistema visual".
- Fuentes: Plus Jakarta Sans + JetBrains Mono (`@expo-google-fonts/*`), cargadas en
  `app/_layout.tsx`.

Agregar o reinstalar una dependencia nativa exige `expo prebuild --clean` + rebuild.

## Cómo correr la app

Usar el skill de proyecto `.claude/skills/run-on-device/SKILL.md` — cubre Metro,
compilar el APK e instalarlo por USB, con las trampas del entorno ya resueltas
(puerto ocupado, adb, babel).

### Build variants: dev / test / prod

Config dinámica en `app.config.ts` (no hay `app.json`). La tabla `variants` define
`name`/`package`/`scheme` por variant, seleccionado con la env var `APP_VARIANT`
(`dev` por defecto). Un `APP_VARIANT` desconocido **lanza excepción** — no hay
fallback silencioso. El ícono es idéntico en los 3; se distinguen por el nombre
"(Dev)"/"(Test)".

| Variant | `applicationId` | Para qué | Cómo se construye |
|---|---|---|---|
| `dev` | `app.meld.mobile` | Iterar día a día, Metro + hot reload | Local, `npm run build:dev` (`assembleDebug`) |
| `test` | `app.meld.mobile.test` | Probar un build "limpio" sin Metro, sin cable | Local, `npm run build:test` (`assembleRelease`) |
| `prod` | `app.meld` | La versión final para las stores | Solo EAS, `npm run eas:prod` — nunca local |

Los tres se instalan uno al lado del otro (apps distintas para Android), cada uno
con su propia base SQLite. El código lee el variant desde
`src/constants/appVariant.ts` (`appVariant`/`isDev`/`isTest`/`isProd`), nunca
desde `process.env` (esa env var solo existe en el proceso de build de Node).

Cambiar el `applicationId` en `app.config.ts` no alcanza: hay que correr
`expo prebuild --platform android --clean`, porque el proyecto nativo generado lo
tiene horneado.

`scripts/build-android.sh` (usado por `build:dev`/`build:test`) recuerda el último
variant en `android/.last-variant`: fuerza `prebuild --clean` solo si el variant
cambió, y si no hace un `prebuild` incremental para conservar las cachés de Gradle.
Si hay un dispositivo conectado (`adb get-state`), instala; si no, deja el APK en
`android/app/build/outputs/apk/...` para transferirlo a mano.

`prod` se rechaza en local (`scripts/build-android.sh prod` sale con error): un
`assembleRelease` local firmaría con la debug keystore y Google Play Protect lo
bloquearía. EAS genera y gestiona una keystore de producción real.

**EAS**: vinculado vía `app.config.ts` → `extra.eas.projectId`
(`0bdd091e-25d8-4d30-9f44-94544b38c6ea`, agregado a mano porque `eas init` no
puede escribir en un config dinámico). Scripts: `npm run eas:test` (distribución
interna, link + QR, firmado por EAS) y `npm run eas:prod`. El usuario todavía
tiene pendiente `npm i -g eas-cli` + `eas login` (interactivo, lo corre él) — no
ejecutar `eas build` sin que lo pida.

## Arquitectura de carpetas

```
/app                    → rutas (Expo Router). Grupo (tabs) es un Stack sin tab
                           bar — ver "Navegación".
/src
  /domain                → tipos y lógica pura, sin dependencias de RN
    dayItem.ts            → DayItem y subtipos (el modelo central)
    date.ts, time.ts       → helpers de fecha/hora (se persiste en minutos-desde-
                              medianoche o "HH:MM" 24h; formato humano solo al
                              renderizar)
    week.ts                → semana ISO-8601 (`getWeekRange`/`getISOWeek`)
    calendarGrid.ts,
    calendarHeatmap.ts     → grilla de mes / heatmap de año; el heatmap alinea el
                              día 1 a su columna real (lunes primero, mismo
                              cálculo que `calendarGrid.ts`)
    quickAdd.ts             → constantes y helpers compartidos entre Quick Add y
                              el detalle (presets, label↔hora, frecuencia de
                              hábito, `PRIORITY_COLOR`)
    voiceParser.ts          → `parseVoiceInput(raw, lang)`: parser offline es+en
                              de una frase → `VoicePrefill`. Ver "Agregar por voz"
    habit.ts                → recurrencia/progreso/racha de hábitos
    healthMetrics.ts         → catálogo de métricas de Auto-registro
    trial.ts                 → prueba de Pro simulada (`TRIAL_DAYS`, `trialDaysLeft`)
    iconNames.ts             → union `IconName`. Vive en domain para que archivos
                              puros puedan tipar `icon` sin importar componentes;
                              `components/Icon.tsx` mapea cada nombre a Lucide
  /data/local
    schema.ts               → tabla Drizzle `day_items` (una tabla ancha, columnas
                              nullable por tipo) + `habit_completions` + `categories`
    db.ts                   → init (CREATE TABLE + ALTER TABLE) e instancia Drizzle
    dayItemRepository.ts    → única puerta de entrada a SQLite
    seed.ts                 → datos de ejemplo (ver abajo)
  /constants
    appVariant.ts             → variant de build leído en runtime vía `expo-constants`
    links.ts                  → URLs de Términos/Privacidad de la landing
  /features/<pantalla>     → una carpeta por pantalla: Screen.tsx + mappers
                              domain→viewmodel de esa pantalla
    calendar/calendarView.ts → `CalendarView` ('week'|'month'|'year') +
                              `CALENDAR_VIEW_ORDER`
    calendar/useWeekAgenda.ts → estado + mutaciones de la vista Semana, separado
                              de la UI para que el selector sticky y la lista
                              compartan datos sin duplicar el fetch
    onboarding/               → ver "Onboarding"
  /components               → design system compartido, agrupado por área
                              (quickAdd/, itemDetail/, dayItem/, calendar/,
                              moments/, settings/, timePicker/, datePicker/,
                              durationPicker/, habitAutoTrack/, voiceAdd/,
                              reminders/)
  /store                    → un store Zustand por responsabilidad
  /theme                    → tokens.ts (paleta, tipografía, `typeColors`,
                              `categoryColors`) + ThemeProvider
  /i18n                      → traducciones es/en — ver "Idioma"
  /hooks, /services          → integraciones nativas (audio, picker de fotos,
                              notificaciones, badge del ícono)
  /widget                    → widgets de pantalla de inicio — ver "Widgets"
```

Componentes compartidos que conviene conocer antes de crear uno nuevo:

- **`Icon.tsx`** — único punto de entrada a íconos.
- **`ScreenHeader.tsx`** — encabezado de Today/Calendar/Inbox/Settings (`TopAppBar`
  lo usa para Today). Título y `right` van en la misma fila con
  `alignItems:'center'`; el subtítulo va debajo, a todo el ancho. Así el header no
  "salta" al cambiar de pantalla y los botones no quedan desalineados por el
  `lineHeight` del título grande.
- **`EmptyState.tsx`** — ícono flotante + título + mensaje + CTA opcional
  (`ctaLabel`/`onPressCta`). Usado en Today (CTA abre Quick Add), Inbox (CTA
  enfoca la captura rápida) y Moments (sin CTA; la fila "Hoy" con "+" va arriba).
  Para que quede centrado, su contenedor necesita `flex:1`, y el
  `contentContainerStyle` del `ScrollView` padre `flexGrow:1`. Con `FlashList` no
  usar `ListEmptyComponent` (no le da altura completa): renderizar un `View`
  `flex:1` hermano del `FlashList`, con el mismo `paddingBottom` que reserva la
  lista para la barra flotante.
- **`ListSkeleton.tsx`** — maquetación gris pulsante mientras carga una lista, para
  que no parpadee el `EmptyState` antes de que lleguen los datos. `variant:
  'rows'|'tiles'`. Calcula la cantidad de filas con `useWindowDimensions` para
  rebasar el borde (un número fijo sugeriría "hay justo N ítems"). Condición
  siempre `loading && <no hay filas visibles>`. Wireado en Today
  (`dayItemsStore.loading`, init `true`), Inbox (`inboxStore.loading`, init
  `true`), agenda Semana (`useWeekAgenda().loading`) y Moments (`tiles`, state
  local). No en Calendar Mes/Año ni Ajustes (siempre muestran estructura).
- **`ConfirmDialog.tsx`** — modal de confirmación del design system. Usado por
  `CategoriesManagerSheet` y `TrialEndedDialog` (variante `tone="accent"`).
- **`dayItem/SwipeToDeleteCard.tsx`** — ver "Eliminar un ítem (swipe)".
- **`calendar/WeekDaySelector.tsx`** — fila L M M J V S D con punto si hay ítems;
  vive en el header FIJO de Calendar para quedar sticky.
- **`calendar/CalendarFilterSheet.tsx`** — hoja del filtro de Calendario.
- **`quickAdd/TimeFieldRow.tsx`, `DateFieldRow.tsx`** — ver "Sistema visual".
- Sin uso, conservados por si se retoman: `calendar/CalendarViewSwitch.tsx`
  (switch de íconos; Calendar usa `SegmentedToggle` de texto),
  `calendar/CalendarFilterBar.tsx` (pill flotante; el filtro se abre desde "•••"),
  `AuraBackground.tsx` (fondo con degradado de Today; hoy Today usa `palette.bg`
  plano). No volver a montarlos sin que se pida.

### Seed (`data/local/seed.ts`)

Solo se inserta si `day_items` está vacía **y** el variant es `dev`
(`TodayScreen.tsx` gatea `seedIfEmpty()` con `isDev`) — `test`/`prod` instalan
100% vacíos. Siembra los 6 tipos de ítem, historial real de `habit_completions`,
Momentos con foto, ítems repartidos por el mes actual, 2 tareas atrasadas (para
ver el rollover) y 8 ítems de Bandeja. Sirve para sacar capturas representativas.

- Las fotos y clips de audio viven en `assets/seed/` y se copian a
  `documentDirectory` en el primer arranque (`expo-asset` + `copySync`). Sin eso,
  una nota de voz con `audioFileUri` vacío muestra "Audio eliminado" y un Momento
  sin `mediaUri` no renderiza.
- `targetFrequency` usa los valores canónicos de `HABIT_SCHEDULE_OPTIONS`
  (`'Every day'`/`'Weekdays'`/`'3x a week'`/`'Weekly'`).
- El contenido sembrado queda en inglés a propósito (es data de ejemplo, no UI).

## Idioma (es/en)

App bilingüe, español por defecto. `src/i18n/translations.ts` tiene los
diccionarios `es`/`en` (mismas claves; TypeScript falla si falta una) más
`WEEKDAY_SHORT`/`MONTH_SHORT`/`MONTH_FULL`. `src/i18n/index.ts` expone
`useTranslation()` (`{ t, lang }`) y `translate(lang, key)` para código fuera de
React. El idioma vive en `settingsStore.language` (persistido).

- **Domain es puro, sin hooks.** Las funciones que formatean fecha/mes/semana
  reciben `lang: Language` como parámetro (default `'es'`).
- **Los valores internos de los presets (`HABIT_SCHEDULE_OPTIONS`,
  `EARLY_ALERT_OPTIONS`, etc.) están siempre en inglés**: son lo que se persiste y
  lo que parsean `labelToHour24`/`earlyAlertToMinutes`/`frequencyTarget`. Se
  traduce solo la etiqueta visible vía `presetLabel(value, lang)`. Igual para
  categorías y métricas de salud: `label`/`id` es el valor canónico, `labelKey` la
  traducción. Traducir los arrays de opciones rompe la persistencia de ítems ya
  guardados.
- El formato AM/PM (`domain/time.ts` → `minutesToLabel`) sigue siempre en inglés
  (pendiente).
- **El español es neutro/latinoamericano, sin voseo**: forma "tú" ("Elige",
  "Actívalo", "Inténtalo"), nunca "-á"/"-í" ("Elegí", "Activalo").

## Modelo de datos

`DayItem` (`src/domain/dayItem.ts`) es una unión discriminada por `type`: `task`,
`event`, `habit`, `note`, `voiceMemo`, `moment`. Todos comparten `DayItemBase`
(`priority` es de todos los tipos, no solo de Task).

- `date: string | null` — null significa que el ítem vive en el Inbox.
- `reminderAt: string | null` — datetime ISO completo. Es la pieza más sutil del
  modelo, no simplificarla sin revisar `mapDayItemToRow.ts` e `ItemDetailSheet.tsx`:
  - `null` = sin recordatorio (se renderiza "—").
  - Hora `ANY_TIME_HHMM` (`domain/time.ts`, `"24:00"`) = "recordarme sin hora
    específica" (campana, "Any Time"). Es `"24:00"` y no `"00:00"` porque el
    wheel-picker nunca produce 24:00, así no colisiona con una medianoche real
    (con `"00:00"`, un recordatorio a las 12:00 AM nunca disparaba).
  - En memoria (Quick Add/`ItemDetailSheet`), el equivalente es
    `ANY_TIME_MINUTES` (`-1`) — ver "Cualquier hora".
  - El sufijo `"Z"` es un artefacto de formato: HH:MM siempre es hora LOCAL.
    `notifications.ts` arma el `Date` a mano; nunca usar `new Date(reminderAt)`.
- **Tabla ancha**: al agregar un campo a un subtipo, tocar `dayItem.ts`,
  `schema.ts` (columna), `db.ts` (CREATE TABLE) y `dayItemRepository.ts`
  (`toDomain`/`toRow`). Si la tabla ya existe en dispositivos instalados, agregar
  además un `ALTER TABLE ... ADD COLUMN` envuelto en try/catch en `db.ts` (SQLite
  no tiene `ADD COLUMN IF NOT EXISTS`; el catch absorbe "duplicate column name") —
  `CREATE TABLE IF NOT EXISTS` no alcanza. `Event.link` reusa la columna `link` de
  `Task`.
- **Notificaciones locales reales**: `reminderAt` con hora específica programa una
  notificación de `expo-notifications` vía `services/notifications.ts` →
  `syncReminderNotification`; "Any Time" no programa nada. Se llama desde los tres
  lugares donde se fija una hora: `timeDragStore.confirm()`,
  `QuickAddSheet.handleSave` e `ItemDetailSheet.handleSave`.
- **Preferencia local vs. permiso del SO** (mismo patrón que `my-wallet-app`):
  - El permiso del SO se pide solo en el paso final del onboarding
    (`NotificationsStep`). Si el usuario lo salta, no se vuelve a pedir hasta que
    intente fijar un recordatorio. `primeNotificationPermissionOnLaunch()` sigue
    exportada pero nadie la llama.
  - `settingsStore.notificationsEnabled` es el toggle de Ajustes. Apagarlo es
    instantáneo y 100% local — nunca abre Ajustes del sistema.
    `syncReminderNotification` no programa nada si está en `false`. Prenderlo pide
    el permiso nativo, y solo si `canAskAgain` es `false` abre
    `Linking.openSettings()`. `SettingsScreen` refresca `canAskAgain` en cada foco,
    pero eso nunca fuerza el valor del toggle.
- **Doze mode**: `app.config.ts` declara `SCHEDULE_EXACT_ALARM`; sin él
  `expo-notifications` usa alarmas no exactas y Doze puede demorar un recordatorio
  minutos u horas. No hay detección si el usuario lo revoca (exigiría un módulo
  nativo para exponer `canScheduleExactAlarms()`; descartado por ahora).

### Hábitos recurrentes y tracking real

- **`habit_completions`** (un registro por día que un hábito se marcó hecho,
  índice único `habitId`+`date`) es la ÚNICA fuente de verdad de completado. Las
  columnas `progress`/`current_streak` de `day_items` son solo un snapshot
  inicial al crear el hábito; no se leen para mostrar el conteo/racha real.
- **`domain/habit.ts`**: `isHabitScheduledOn(schedule, date)` ("Weekdays" salta
  sábado/domingo; el resto se ofrece todos los días y el usuario elige en cuáles
  cumplir el objetivo semanal). `computeWeekProgress`/`computeStreak` calculan
  "x/y" y racha a partir de un `Set` de fechas. Racha diaria (Every day/Weekdays)
  o semanal (3x a week/Weekly); si el período actual todavía no se completó, no
  cuenta como racha rota.
- **Repositorio**: `listActiveHabits()` trae todos los hábitos ignorando `date`
  (en un hábito es la fecha de creación) y excluye `status: 'inbox'`.
- **`dayItemsStore.reload()`** trae `listByDate` + ocurrencias recurrentes de
  hábitos programados para `selectedDateKey` (si `habitsInTodayEnabled`) con
  progress/streak recalculados en memoria + `listOverdueTasks`, más un
  `habitCompletedMap`. **Rendimiento**: las consultas van en un solo
  `Promise.all` (y `loadHabitOccurrences` usa `Promise.all` por hábito); con
  `await` secuenciales el cambio de día se sentía lento. Cualquier consulta nueva
  va dentro de ese `Promise.all`.
- **`toggleHabitComplete(id)`** alterna el registro para `selectedDateKey`,
  recalcula progress/streak y muestra la fila de Deshacer (texto
  `habitCompleted`). El contador "X de Y hechos" de `DayBar` lee
  `habitCompletedMap` (un hábito nunca cambia `status`).
- **Marcar cualquier hábito lo saca de la lista de Today** (`visibleRows` filtra
  `habitCompletedMap[id]`), igual que una Task. El registro sigue en
  `habit_completions` y el heatmap lo cuenta; ocultarlo es solo de render. La
  recurrencia lo vuelve a traer al día siguiente.
- **UI**: `DayItemRow` → `Leading` `habitIcon`, tocable vía
  `onToggleHabitComplete` (Pressable anidado, igual que el checkbox de Task).
  `TodayItemRow` recibe `habitCompletedToday`/`onToggleHabitComplete` como props
  opcionales (`WeekAgendaView` no las pasa). `habitIcon.healthIcon?` se dibuja
  como ícono chico APARTE, después del cuadro de completar — nunca en su lugar
  (reemplazarlo hacía parecer "completado" un hábito que no lo estaba). No existe
  anillo decorativo (`ringIcon`); no reintroducirlo.
- **Heatmap de Año** (`calendarHeatmap.ts` + `computeHeatmapDotState`):
  `buildMonthHeatmap` recibe un callback `dayState(dateKey, date)` que
  `CalendarScreen` arma con `listActiveHabits()` + completados del año. `'green'`
  = todos los hábitos programados ese día hechos, `'red'` = al menos uno no,
  `'none'` = ninguno programado. Si el filtro de Calendario es un hábito,
  agrega solo ese; si no, entre todos.

### Auto-registro (picker de métricas de salud)

- **`domain/healthMetrics.ts`** → `HEALTH_METRIC_OPTIONS`: 15 métricas en 3
  grupos (`activity`: Steps/Exercise minutes/Active energy/Sleep con
  `defaultTarget`/`unitKey`/`step`; `rings`; `workouts`). Solo `activity` tiene
  objetivo numérico. `id` se persiste en `Habit.healthMetric`; el objetivo en la
  columna `health_metric_target`.
- **`habitAutoTrack/AutoTrackModal.tsx`**: bottom-sheet scrollable con "None" + las
  3 secciones; las métricas de Actividad muestran un stepper inline (mínimo
  `option.step`). Incluye `autoTrackProNote`, la nota de producto sobre el plan Pro
  (ver "Roadmap Pro").
- **`quickAdd/HealthAutoTrackFieldRow.tsx`** abre el modal desde Quick Add/
  `ItemDetailSheet`. Elegir cualquier métrica convierte el hábito en "de salud" al
  guardar (`colorStyle: 'cool'`, `autoTrack: true`) — es la forma de crear un
  hábito de salud, no hay un flujo aparte.
- `mapDayItemToRow.ts` → `leadingFor` arma `healthIcon` desde
  `HEALTH_METRIC_OPTIONS` (solo `colorStyle: 'cool'`).
- `sortWithHealthHabitsLast` (aplicado en `TodayScreen` sobre `visibleRows`) manda
  los hábitos de salud al final, orden estable. No aplica a la agenda Semana.
- El check sigue siendo manual para todos los hábitos, con o sin Auto-registro.

### Categorías configurables

- **Tabla `categories`** (`id`/`label`/`icon`/`color`/`sort_order`), sembrada una
  sola vez si está vacía con Work/Personal/Health (`cat-work`/`cat-personal`/
  `cat-health`); después son filas normales. `QUICK_ADD_CATEGORIES` de
  `quickAdd.ts` queda solo como default de esa siembra y fallback de
  `voiceParser.ts`.
- **`category`/`categoryColor` de `day_items` son texto copiado al crear el ítem,
  no una referencia.** Renombrar/recolorear una categoría no actualiza ítems
  existentes, y borrarla los deja con el texto huérfano (se sigue mostrando).
- **`store/categoriesStore.ts`**: `categories` + `usage` (`{pending, total}`
  agrupado en memoria desde `listCategoryUsage()`). Se carga al arrancar
  (`_layout.tsx`) y al abrir la gestión.
- **`settings/CategoriesManagerSheet.tsx`** (Modal full-screen, store
  `categoriesSheetStore`, fila "Categorías" en Ajustes → General): lista con
  ícono+color+nombre+badge (pendientes, "Completado" si `total>0 && pending===0`,
  o nada). `CategoryFormModal.tsx` (Modal sobre Modal) con grid de íconos
  (`CATEGORY_ICON_OPTIONS`) y colores fijos (`CATEGORY_COLOR_PALETTE`, no picker
  libre). Eliminar pasa por `ConfirmDialog`. Sin drill-down a los ítems de una
  categoría (eso se hace filtrando en Calendario).
- **`CategoryChips` lee del store** y muestra `cat.label` directo, sin `t()` (es un
  nombre que tipeó el usuario).

## Sistema visual

Dark-first, fiel a mocks de referencia que el usuario fue pasando pantalla por
pantalla. Todo color sale de `src/theme/tokens.ts` (`bg`, `surface`,
`surfaceLow`, `surfaceHigh`, `pillSolid`, `border`, …); no hardcodear un hex nuevo
sin chequear que combine. La paleta clara es gris neutro sin sesgo cálido: si
algo se ve beige/marrón, es una regresión.

- **En modo claro `bg` y `surface` son el mismo blanco.** Las filas de lista
  (`DayItemRow`/`InboxItemRow`) usan `surfaceLow` como fondo; con `surface` se
  vuelven invisibles. Las cards elevadas que sí usan `surface`
  (`SettingsSection`) necesitan `borderWidth: 1, borderColor: palette.border`.
  Divisores internos (`SettingRow`) usan `palette.border`, nunca un gris fijo.
- **Título grande de header (34px, `font.extrabold`) lleva `lineHeight: 46`**, y
  el subtítulo (15px) `lineHeight: 20`. Sin `lineHeight` el hueco
  título→subtítulo queda enorme; con menos de 46 se recorta el descendente
  (la "y" de "Hoy"). Al crear un header nuevo, confirmar con una palabra real con
  descendentes.
- Today usa `palette.bg` plano, sin degradado (ver `AuraBackground` en
  "Arquitectura").
- **`palette.danger`** (basura del swipe) es un rojo saturado: `#E5484D` dark,
  `#d9294a` light. Si se ve "rosado" o se confunde con el coral del `accent`, el
  token a revisar es este.
- **`typeColors`** (fijo, independiente de acento y tema): tarea `#3B82F6`, evento
  `#EF4444`, hábito `#22C55E`, nota `#EAB308`, audio `#8B5CF6`, momento `#F97316`.

Convenciones de UI — reusar, no reinventar:

- **Selección activa de cualquier control** (chip, tab, prioridad) usa
  `palette.accent`, nunca el color propio del dato.
- **Íconos: siempre `<Icon name="..." />`**, nunca `MaterialIcons`/
  `@expo/vector-icons`. `Icon` mapea nombres semánticos (p. ej.
  `'delete-outline'`) al componente Lucide. Para un ícono nuevo: agregar el nombre
  en `domain/iconNames.ts` y el mapeo en `Icon.tsx` (no requiere rebuild nativo).
- **`FieldRow`** (icono + etiqueta + valor) es la fila base de Quick Add/
  `ItemDetailSheet`. Encima hay tres patrones:
  - `PresetFieldRow` — acordeón inline de presets fijos para campos que no son una
    hora real (Repetir, Alerta previa de Event, Hora preferida de hábito).
  - `TimeFieldRow` — abre `timePicker/TimePickerModal` (wheel hora/minuto +
    AM/PM) para horas reales (Recordarme, Empieza de Event). Task no tiene un campo
    "Hora" aparte: "Recordarme" cumple ese rol.
  - `DateFieldRow` — abre `datePicker/DatePickerModal` (calendario de mes + chips
    rápidos). Los chips son solo "Hoy" (+ "Bandeja" con `allowInbox`); **sin chip
    "Mañana"**, el calendario ya lo cubre.
  - `DurationFieldRow` — abre `durationPicker/DurationPickerModal` (horas 0-4 +
    minutos en pasos de 15), trabaja en minutos totales.
- **Quick Add/ItemDetailSheet son UNA sola card (`configBox`) con un ÚNICO
  `fieldGroup` (`gap:0`)** que contiene los campos del tipo + Categoría +
  Prioridad, separados solo por líneas divisorias. Un segundo `fieldGroup` mete un
  salto de 24px (`configBox` tiene `gap:24`). La línea antes de Categoría es el
  borde inferior del último `FieldRow` del bloque (dejar `showBorder` en `true`);
  la línea entre Categoría y Prioridad es `showBorder` de `CategoryChips`, y vive
  en un solo lugar (header colapsado o pie de los chips), nunca en los dos.
- **Categoría y Prioridad son acordeones colapsados por default** (estado
  `expanded` local): el header muestra el valor actual + chevron y los chips solo
  se renderizan expandidos. **Todo acordeón de selección se colapsa al elegir un
  valor.** La animación de todo acordeón inline sale de
  `quickAdd/accordionMotion.ts` (`ACCORDION_LAYOUT`/`ACCORDION_ENTER`/
  `ACCORDION_EXIT`); no definir duraciones nuevas.
- **`PRIORITY_OPTIONS`**: cada prioridad tiene su color de bandera (Ninguna
  `#8E8E93`, Baja `#4F9DDE`, Media `#F2A93B`, Alta `#E5484D`). Sin seleccionar, la
  bandera usa ese color; seleccionada, blanco sobre `palette.accent`.
- **Dictado en el campo de título** (`hooks/useVoiceDictation.ts`): mic en la
  esquina inferior derecha del cuadro de título de Quick Add/`ItemDetailSheet`
  (el cuadro tiene `minHeight`/`paddingBottom` extra para no tapar texto).
  Idioma `es-ES`/`en-US` según la app, `interimResults: true`, `continuous:
  false` (reemplaza el título en vivo y se corta solo; tocar el mic también
  corta). Si no se concede el permiso, no hace nada (sin mensaje todavía).
- **Acciones destructivas**: eliminar un ítem borra directo y muestra Deshacer
  (ver "Eliminar un ítem"). Si una acción sí necesita confirmar antes, usar
  `ConfirmDialog`, nunca `Alert.alert`.
- **Cluster derecho de `DayItemRow`** = lista ordenada de badges + una acción.
  `type TrailingBadge` (`overdue` | `priority` | `recurrence` | `subtasks`
  (reservado, sin modelo aún) | `habitProgress` | `streak` | `favorite` |
  `category`). `mapDayItemToRow.ts` → `trailingBadgesFor()` los emite ordenados
  por precedencia y recortados a `MAX_TRAILING_BADGES` (2): atraso › prioridad
  (solo media/alta) › subtareas › recurrencia › progreso/❤ de hábito › racha ›
  categoría. La acción (reproducir audio / abrir link, props `playback`/
  `audioDeletedLabel`/`hasLink`) va aparte y no cuenta contra el tope.
  - Categoría: punto de color + primera palabra recortada a ~12 chars
    (`shortCategory`).
  - Recurrencia: ícono `repeat` si una `task` tiene `repeatRule`.
  - Racha: `🔥 N` para `currentStreak >= 2`, color `STREAK_COLOR` (`#F59E0B`,
    local a `DayItemRow`). En la agenda Semana puede ser el snapshot de la DB.
  - Atraso: ícono `schedule` en `palette.danger` para toda task con `date < hoy` y
    `status !== 'done'`.
  - Ícono `checklist` reservado para el badge de subtareas.
- **`FloatingBar`** es el esqueleto de toda barra inferior (Today/Calendar/Inbox/
  Moments/Settings); no crear una barra desde cero.
  - Tres piezas sueltas con hueco entre ellas: menú (círculo 52, `borderRadius`
    fijo 26), pill central, FAB (círculo, `borderRadius: fabSize / 2`, `fabSize`
    56 en las 5 pantallas). Alineadas al fondo (`alignItems:'flex-end'`, alto
    `FLOATING_BAR_HEIGHT`); nunca se mueven ni se agrandan.
  - En idle no hay contenedor con fondo: el `center` de cada pantalla flota solo,
    así que **cada pantalla dibuja su propio pill** (`palette.pillSolid`, `height:
    48`, `borderRadius: 24`). Envolverlo en otra card produce un doble recuadro.
  - La fila extra (`TimeConfirmRow` / `UndoRow` / `topRow`, mutuamente
    excluyentes: `dragging ? <TimeConfirmRow/> : undoVisible ? <UndoRow/> :
    topRow`) es una card separada encima de toda la barra (ancho completo, fondo
    `palette.surface` + sombra, alto `FLOATING_BAR_CONFIRM_ROW_HEIGHT`, hueco
    `FLOATING_BAR_ROW_GAP` = 10 debajo). Todo elemento posicionado relativo a la
    barra (`TimeDragOverlay`) suma `FLOATING_BAR_CONFIRM_ROW_HEIGHT +
    FLOATING_BAR_ROW_GAP` cuando hay arrastre o Undo; si se olvida, se superpone.
  - Ninguna pieza tiene `borderWidth`, solo sombra.
  - `barRadius` default 24 (solo lo usa la card de la fila extra).
- **Puntos del grid de Mes** usan `typeColors[item.type]`. La vista Año es el
  heatmap verde/rojo de hábitos, no puntos.

## Logo, ícono y splash

El logo (`assets/logo.png`, copiado a `splash-icon.png`) es un círculo con un
check integrado en el contorno, degradado blanco→coral `#FF4B66`. **Sigue en
iteración** (el fondo del archivo fuente sale blanco en vez de negro y el check es
un trazo superpuesto en vez de recortado) — no darlo por definitivo sin confirmar
con el usuario.

**Ícono del launcher** — capas recortadas de `logo.png`, sin fondo distinto por
variant: `android-icon-background.png` (degradado negro full-bleed),
`android-icon-foreground.png` (círculo coral con el check dentro de la zona segura
72/108), `android-icon-monochrome.png` (círculo sólido con el check calado) e
`icon.png` (cuadrado completo, iOS/legacy).

**Contador de pendientes sobre el ícono**: `services/appBadge.ts` →
`refreshAppBadge()` fija `Notifications.setBadgeCountAsync(n)` con n = tareas de
hoy sin completar + atrasadas (mismo criterio que Today). Se llama desde
`refreshWidgets()` (hereda todos los puntos de mutación), desde el headless task
del widget (se actualiza cada 30 min con la app cerrada) y al volver a primer
plano (`AppState` en `app/_layout.tsx`). En Android solo lo muestran launchers con
badges numéricos (Samsung sí; Pixel/Moto pintan un punto) — no es un bug. iOS
requiere permiso de notificaciones.

### Splash animado (`src/components/AnimatedSplash.tsx`)

Reemplaza al splash nativo estático (mismo logo/fondo, plugin
`expo-splash-screen` en `app.config.ts`) apenas React puede pintar: ícono con
rebote de escala, glow pulsando detrás, wordmark "Meld" y lema (`appTagline`) en
cascada; de salida, el mismo nodo del glow se expande hasta cubrir la pantalla y
corta a Today. ~1.9s. Reglas (cada una evita un bug visto en dispositivo):

1. **El glow es un `RadialGradient` de `react-native-svg`** con stops que se
   desvanecen a transparente. Un color plano con `opacity` se ve como un disco
   duro, y sobre fondo oscuro oscurece hacia marrón en vez de aclarar.
2. **Un solo árbol de contenido a la vez** (`introDone` en `app/_layout.tsx`),
   no un overlay absoluto sobre `RootStack`. `GestureHandlerRootView`/
   `SafeAreaProvider` van montados SIEMPRE arriba: sin ellos el `Svg` no pinta
   (logcat: `Unable to find SurfaceMountingManager`).
3. **`logoOpacity` arranca fijo en `1`** — la aparición es solo el rebote de
   escala. Un fundido de opacidad se solapa con el ícono nativo y se ve doble.
4. **Ícono y bloque de texto son dos `View` `position:absolute`
   independientes**, anclados al centro de la pantalla. Si comparten un contenedor
   flex, el texto (aunque invisible) empuja el ícono hacia arriba.
5. **`imageWidth` del plugin `expo-splash-screen` = `ICON_SIZE`** (160) de
   `AnimatedSplash.tsx`, o hay salto de tamaño en el handoff.
6. **`SplashScreen.hideAsync()` se llama directo en un `useEffect`** de
   `app/_layout.tsx`, no detrás de un `onLayout` (llegó a tardar 27s).

## Navegación

No hay tab bar nativa. `(tabs)/_layout.tsx` es un `Stack` sin header — reintroducir
`Tabs` de Expo Router duplica la navegación.

**El menú se expande INLINE dentro de `FloatingBar`**: tocar "☰"
(`navigateMenuStore`) oculta el pill central y el FAB y los reemplaza por una fila
con los 5 destinos (`NAV_DESTINATIONS` en `FloatingBar.tsx`); el botón pasa a "×".
Transición con `accordionMotion.ts`. Mientras está abierto se suprime la fila
extra. Orden fijo pedido por el usuario: **Hoy, Bandeja, Calendario, Momentos,
Ajustes** — no reordenar.

**Header de Today** (`TopAppBar.tsx`): buscar + agrupar (`filter-list`, pinta en
`accent` si está activo) + "más" (`more-horiz`, abre `RemindersSheet`). Bandeja se
accede desde el menú ☰, no desde el header.

## Interacciones no obvias

### Quick Add y detalle de ítem

- **Quick Add** (`components/quickAdd/QuickAddSheet.tsx`): hoja global montada en
  `app/_layout.tsx`, se abre con `useQuickAddStore.getState().open(type)`.
  "Recordarme" en Apagado (`null`) no manda el ítem al Inbox — Quick Add nunca
  manda al Inbox (para eso está la captura de `InboxScreen` o reclasificar en el
  detalle). Nota de voz requiere grabación antes de guardar.
- **Campo Día para los 6 tipos**: un `DateFieldRow` compartido (`dateKey`, sin
  `allowInbox`) arriba del `fieldGroup`; `handleSave` lo usa para `date` y para
  armar `reminderAt`. En hábitos es la fecha de creación (la recurrencia decide en
  qué días aparece).
- **Cualquier hora (Any Time)** es un control real: `TimeFieldRow` maneja tres
  estados (`null` = Apagado, número = hora, `ANY_TIME_MINUTES` = sin hora
  puntual). Se habilita con `allowAnyTime` — solo en "Recordarme" de Task/
  VoiceMemo/Note, no en "Empieza" de Event. `WheelTimePicker` muestra un botón
  "Cualquier hora" (`onSelectAnyTime`). Al guardar, `reminderAtFromMinutes`
  (duplicado a propósito en `QuickAddSheet`/`ItemDetailSheet` por el manejo de
  Inbox) convierte a `ANY_TIME_HHMM`; al releer, `reminderMinutesOrNull` hace el
  camino inverso — sin eso un "Any Time" reabre como "Apagado".
- **Link editable en task y event**: `LinkFieldRow` (input URL + "↗"). La fila
  muestra "↗" (`hasLink`) en ambos tipos.
- **Nota: cuerpo de texto** (`richTextBody`): cuadro multilínea "Escribe una
  nota..." debajo del título, solo para `note`, en las dos hojas.
- **`VoiceRecordRow`** (grabar dentro de Quick Add/`ItemDetailSheet`) tiene 3
  estados: inactivo ("Toca para grabar"), grabando (punto rojo pulsante
  `RecordingDot` + timer + Pausar/Reanudar + Detener) y grabada (▶/⏸ con
  `useVoiceMemoPlayer`, waveform decorativo, duración, basura para regrabar).
  Pausa/reanuda real (`useVoiceRecorder().pause()`/`resume()`); el estado de pausa
  es local al componente. Recibe el objeto `recorder` completo; el padre solo
  maneja `onRecorded(uri, seconds)` y `onDelete`. En `TypeTabs`, Nota de voz usa
  el ícono `mic`.
- **Arrastrar hacia abajo desde el handle cierra la hoja**: hook
  `hooks/useSheetDragDismiss.ts` (`Gesture.Pan` + `translateY`, umbral
  120px/800px·s, `runOnJS(close)` al salir de pantalla), usado en `QuickAddSheet`,
  `ItemDetailSheet` y `CategoryFormModal`. El `GestureDetector` envuelve solo el
  `handleGrabArea`; el `translateY` anima la hoja entera. Toda hoja nueva con
  handle usa este hook (`AutoTrackModal` todavía no lo tiene).
- **`TypeTabs` se selecciona por arrastre continuo** (compartido por Quick Add e
  `ItemDetailSheet`): `Gesture.Pan` con `minDistance(0)`; `onBegin`/`onUpdate`
  calculan el índice con `event.x / trackWidth`, midiendo el ancho con `onLayout`
  **sobre el `View` que envuelve al `GestureDetector`** (medir otro contenedor con
  padding corre el índice). El cálculo va inline en el worklet (ver Gotchas); solo
  `selectIndex` pasa por `runOnJS`. La selección visual es un único thumb
  (`Animated.View` absoluto, `withTiming`), no un `backgroundColor` por tab (se veía
  brusco y perdía las esquinas). Los íconos van en una capa aparte y cambian de
  color al instante. Los tabs son `View`, no `Pressable`. `onChange` solo se llama
  cuando cambia el índice (cambiar de tipo resetea campos).
- **Detalle de ítem** (`components/itemDetail/ItemDetailSheet.tsx`): se abre
  tocando cualquier fila (`useItemDetailStore.getState().open(id)`) — al crear una
  pantalla nueva con `DayItemRow`/`InboxItemRow`, cablear el `onPress`. Es un
  espejo de `QuickAddSheet`: header con título del tipo + "X" que solo cierra (no
  guarda), `TypeTabs` para reclasificar, título en `inputBox` pre-llenado. Guardar
  es solo el botón "Actualizar ___". `dateKey === null` fuerza `status: 'inbox'`
  (un ítem del Inbox guardado sin tocar la fecha se queda en el Inbox).
  `handleTypeChange` resetea solo los campos específicos del tipo anterior
  (conserva título/fecha/categoría/prioridad). Al cambiar a Nota de voz sin
  grabación, aparece `VoiceRecordRow` y guardar se deshabilita hasta grabar. Los
  campos nuevos del tipo destino arrancan con los mismos defaults que usa Quick Add
  al crear.
- **Wheel-picker de hora** (`components/timePicker/`): `WheelTimePicker` con
  columnas 1–12 / 0–59 (`FlatList` con snap) + AM/PM, en minutos-desde-medianoche.
  Si "se abre vacío": en Android `initialScrollIndex` a veces no aplica — el fix
  es `onContentSizeChange` re-aplicando `scrollToOffset({animated:false})` +
  `initialNumToRender={values.length}`.
- **Calendario de día** (`components/datePicker/`): `DatePickerModal` +
  `MonthCalendarPicker`, reusa `calendarGrid.ts` y `WeekdayHeaderRow`.

### Agregar por voz / texto (speed-dial del FAB)

Tocar el "+" abre un speed-dial (`components/AddMenu.tsx`, `store/addMenuStore.ts`,
montado en `_layout.tsx`): el "+" pasa a "×" y aparecen "Por voz" (mic, `accent`)
y "Por texto" (doc, azul). "Por texto" → Quick Add vacío. "Por voz" →
`voiceAddStore` abre `voiceAdd/VoiceAddScreen.tsx` (modal full-screen, orbe con
`RadialGradient`, `expo-speech-recognition`, auto-stop a 2 s de silencio,
hápticos, reintento). Al terminar, `parseVoiceInput` arma un `VoicePrefill` (un
ítem por frase) y `quickAddStore.openWithPrefill()` abre Quick Add pre-llenado
(aplica el prefill DESPUÉS de `resetForm`, solo pisa lo detectado; hora de
hábito → bucket Mañana/Tarde/Noche). Today/Calendar/Inbox pasan
`onAddPress={() => useAddMenuStore.getState().open()}` (Inbox solo fuera de
selección múltiple). El "×" del `AddMenu` mide 60px (vs. 56 del FAB) con elevación
alta para tapar el FAB real detrás del backdrop; alinear con
`FLOATING_BAR_HEIGHT`/`FLOATING_BAR_MARGIN`. Esta versión offline es gratis para
todos (ver "Roadmap Pro").

### Today

- **Vista agrupada** (`TodayScreen.tsx` + `TodayGroupHeader.tsx`): el ícono
  `filter-list` alterna entre lista plana y agrupada por tipo — Eventos › Tareas ›
  Hábitos › Notas › Audios (`GROUP_ORDER`). Cada sección tiene header tocable para
  colapsar; las vacías se ocultan. Estado solo de sesión (`useState`). Respeta los
  mismos filtros que la lista plana; se ignora con búsqueda activa. Se implementa
  como `flatMap` de `[header, ...filas]` hijos directos del `ScrollView`, para
  conservar el `gap: 12` y las animaciones por fila.
- **Checkbox de Task siempre muestra el glifo `check`**: `dim` sin completar,
  blanco sobre `accent` completada (identifica el tipo).
- **Completar una Task la oculta de Today**: `toggleComplete` marca
  `status:'done'`, `visibleRows` la filtra (sale con `FadeOut`) y aparece Deshacer
  ("Tarea completada"). Sigue en `items` (cuenta para "X de Y hechos"). Solo en
  Today: la agenda Semana muestra las completadas tachadas, para conservar el
  registro. Los hábitos siguen el mismo patrón con su propio toggle.
- **Tareas atrasadas — rollover virtual**: `listOverdueTasks(dateKey)` trae tasks
  `scheduled` con `date` anterior; `reload()` las suma primero a `items` SOLO
  cuando `selectedDateKey` es hoy. La `date` original nunca se toca (Calendario
  las sigue mostrando en su día). Completarla usa el flujo normal.
- **Cambiar de día**: chevrons o swipe sobre el pill de `DayBar` (`Gesture.Pan`,
  ±16px). **Tocar el pill abre `DatePickerModal`** para saltar a cualquier día.
  Si el día no es hoy, `DayBar` pasa `topRow` a `FloatingBar` con "Volver a hoy"
  (`BackToTodayRow`, `onBackToToday`). Para este patrón en otra pantalla, pasar
  `topRow`; no crear otra pill flotante.
- **Swipe en cualquier parte de la lista también cambia de día**
  (`swipeDayGesture`): mismo mecanismo que Calendar, umbral alto (±40px/
  600px·s) para no competir con el swipe de las filas (±10, que gana si el toque
  arranca sobre una fila). El `ScrollView` se importa de
  `react-native-gesture-handler`. Se ignora con búsqueda activa.
- **Arrastrar para poner hora** (`TimeDragOverlay.tsx` + `timeDragStore.ts`):
  tocar el "—" de una fila activa un gesto que cubre la pantalla (excepto la
  franja de `FloatingBar`, ver `floatingBarGeometry.ts`) y cambia la hora en pasos
  de 15 min. La fila muestra un pill coral con la hora + chevrons (`TimeMarker.kind
  === 'dragging'`) y aparece `TimeRuler` a la izquierda. Confirmar/cancelar es
  `TimeConfirmRow`, la card que `FloatingBar` dibuja encima de la barra — no crear
  un overlay independiente (se superpone con el menú). `confirm()` agenda el ítem
  y programa la notificación.
- **Búsqueda** (`TopAppBar` + `searchStore.ts`, solo Today): el campo aparece
  debajo del header. `results` es `null` (mostrar Hoy tal cual) o un array
  (resultados reales, con 3+ caracteres o Enter). `searchByTitle` hace `LIKE`
  sobre toda la tabla, así que los resultados usan una fila propia (ícono + título
  + fecha), no `TodayItemRow` (sus handlers solo conocen el día seleccionado).
- **Próximos recordatorios** (botón `more-horiz` de `TopAppBar` +
  `remindersStore.ts` + `reminders/RemindersSheet.tsx`): ítems con `reminderAt`
  desde ahora en adelante (incluye Any Time), cronológicos. Vacío suele significar
  que ya pasaron todos los de hoy — confirmar la hora del dispositivo antes de
  asumir un bug.
- **Ir a un día puntual desde otra pantalla**: `router.push({ pathname: '/',
  params: { date: dateKey } })`. `TodayScreen` lee `useLocalSearchParams` y hace
  `setSelectedDate(fromDateKey(date))`. **Nunca escribir
  `dayItemsStore.selectedDateKey` desde afuera**: el día que se pinta es un
  `useState` local de `TodayScreen`, y el store solo lo refleja (local → store).

### Filas, borrado y audio

- **Eliminar un ítem (swipe)**: en Today, Inbox y la agenda Semana, deslizar a la
  izquierda revela el botón rojo (`SwipeToDeleteCard`, RNGH + Reanimated). Tocarlo
  borra directo (`dayItemsStore.remove` / `inboxStore.remove` /
  `useWeekAgenda().remove`, los tres cancelan la notificación) y muestra `UndoRow`
  por `UNDO_DURATION_MS` (4s, `undoStore.ts`). `UndoRow`: anillo de progreso
  (`Circle` animado, `strokeDashoffset` de 0 a `RING_CIRCUMFERENCE`, horario desde
  las 12 vía `rotation={-90}`) con ícono adentro (`delete-outline` rojo / `check`
  accent), mensaje y pastilla "↩ Deshacer". Deshacer reinserta con `upsert` y
  reprograma la notificación. Un solo Undo pendiente a la vez; el anterior queda
  definitivo en silencio (spec: "toda acción destructiva muestra snackbar con
  Deshacer").
  - El fondo con el botón es un hermano absoluto de la fila animada, con opacidad
    atada a `translateX` vía `interpolate`. Con `opacity: 1` fijo, el rojo se ve
    un frame al remontar filas rápido.
  - Si `onScheduleToday` está presente (solo Inbox), deslizar a la DERECHA revela
    "Hoy" verde → `inboxStore.scheduleToday(id)`, sin confirmar. El callback se
    dispara desde el worklet, así que pasa por `runOnJS`.
  - Una fila completada necesita `needsOffscreenAlphaCompositing` en el `View`
    exterior de `DayItemRow`; sin eso, en Android su `opacity` transparenta el
    botón rojo cerrado.
- **Reproducción de nota de voz**: cada fila llama `useVoiceMemoPlayer(uri)` (un
  player nativo por fila — revisar performance si hay listas muy largas). Al tocar
  play, `TodayItemRow` pasa `playbackExpanded` y la fila muestra una barra de
  controles (tiempo, waveform decorativo, eliminar, play/pausa, cerrar). **Eliminar
  ahí borra SOLO el audio** (`clearVoiceMemoAudio`: borra el archivo y vacía
  `audioFileUri`/`durationSeconds`); la fila pasa a "Audio eliminado". Para borrar
  el ítem, swipe. No hay botón guardar en esa barra.

### Inbox

- **Captura rápida**: "¿Qué tienes en mente?" crea una Task directo con `status:
  'inbox'` y defaults. Las filas (`InboxItemRow`) no muestran el ícono de tipo (el
  ítem todavía no está clasificado); el círculo punteado usa
  `borderColor: palette.textDim`. Una task con `link` muestra ícono de archivo +
  "↗" en vez de la fecha relativa.
- `FlashList` se usa solo acá (la única lista no acotada). Ver "Simplificaciones".

### Calendario

- **3 vistas** (`SegmentedToggle` de texto Mes/Semana/Año; Mes es la inicial).
  También se cambia con swipe horizontal (`swipeViewGesture`, ±40px/600px·s, sin
  wrap-around, orden `CALENDAR_VIEW_ORDER`). Las 3 `ScrollView` se importan de
  `react-native-gesture-handler` (un `ScrollView` nativo no compone con un
  `Gesture.Pan` ancestro).
- **Semana**: agenda vertical por día que reusa `TodayItemRow` con handlers de
  `useWeekAgenda` (sus ítems son de varios días). El selector de días vive en el
  header fijo; tocar un día hace scroll a su sección (offsets medidos con
  `onLayout`, guardados en un `ref` de `CalendarScreen`). Momentos no aparecen acá.
- **Header**: título de 26px con chevron + botones `calendar-month` y
  `more-horiz`. Título/chevron o `calendar-month` abren `DatePickerModal` sembrado
  con `viewedMonth`; se usa solo el mes/año elegido y fuerza `view = 'month'`.
  "•••" abre `CalendarFilterSheet`. `viewedMonth` es independiente de `today` y
  solo afecta a Mes; Año sigue anclado al año actual.
- **Grid de Mes** (`MonthDayCell.tsx`): el primer `Moment` del día se muestra como
  miniatura real (`Image` con `mediaUri`) debajo del número; el resto de ítems
  como puntos `typeColors[item.type]` (tope `MAX_DOTS = 3`). Cada celda es tocable
  y navega a Today en ese día (ver "Ir a un día puntual").
- **`CalendarTodayCard`** (debajo del grid): siempre datos de HOY, sin importar el
  mes visto. "Hoy · {fecha}" + "Ver día" (visual) + Tareas X/Y, Hábitos X/Y,
  Momentos + miniatura. Toda la card es un `Pressable`. Los hábitos se calculan
  aparte (`isHabitScheduledOn` + `listAllHabitCompletionsInRange`), porque un
  hábito solo figura en `itemsByDate` en su fecha de creación.
- **Filtro** (`calendarFilterStore.ts` + `CalendarFilterSheet.tsx`): "Todo" + un
  tipo por fila + sección "HÁBITOS" con cada hábito existente por título
  (`listDistinctHabitTitles`; filtra por `type === 'habit' && title === X`). Aplica
  a puntos y miniaturas del grid, a la agenda semanal y al heatmap de Año. El
  ícono de embudo solo acompaña a un filtro específico, no a "Todo".

### Momentos

Por DÍA: varias fotos por día (id único en `pickMomentPhotoForToday`, siempre con
`date` = hoy). `MomentsScreen` agrupa por `date` (más reciente primero), un
`MomentsDayRow` por día (fecha + tira horizontal). El "+" va a la izquierda de la
tira y solo en el día de hoy (`canAdd`). `weekOfYear` se sigue calculando pero no
agrupa. Los Momentos **no aparecen** en Today ni en la agenda Semana, y el
contador de `DayBar` usa `countableItems` (sin moments); sí cuentan para el grid
de Mes y `CalendarTodayCard`. Tocar una foto abre `MomentPhotoViewer` (Modal
transparente, fondo `#000`, `contain`, tocar o "X" cierra; sin zoom por gesto).

## Widgets de pantalla de inicio

4 widgets distintos, con nombres canónicos en `src/widget/androidWidgetTree.ts` →
`WIDGET_NAMES` (usados por Android y por los `kind` de Swift):

- **`TodayWidget`** ("Hoy") — conteo "X/Y" en pill + ítems de hoy con ícono de
  tipo, hora ("—" sin hora) y título (una línea, truncado con "…" — a propósito).
  Datos: `todayWidgetData.ts` (`listByDate(hoy)`, hasta 12 ítems; sin ocurrencias
  recurrentes de hábitos).
- **`QuickAddWidget`** ("Agregar rápido") — estático, abre Quick Add por deep link
  (`?openQuickAdd=task`, manejado en `app/_layout.tsx` → `handleDeepLink`, con la
  app abierta o cerrada). Android usa `clickAction="OPEN_URI"` con
  `Linking.createURL` (scheme real del variant). No se refresca por mutaciones.
- **`ProgressWidget`** ("Progreso del día") — el mismo `doneCount`/`totalCount` de
  `todayWidgetData.ts`, número grande centrado.
- **`HabitsWidget`** ("Hábitos") — `habitsWidgetData.ts` reimplementa
  `loadHabitOccurrences` sin el store (corre también en el headless task). Si
  "Hábitos en Hoy" está apagado, queda vacío.

Paleta fija dark (sin acceso a `ThemeProvider`): fondo `#1C1C1E`, texto `#FFFFFF`,
dim `#8E8E93`, acento `#FF4B66`, pill `#2A2A2C`. Si se agrega un tipo de `DayItem`,
agregar su ícono en `androidIcons.ts` y en `sfSymbol` de Swift.

### Android (probado en dispositivo)

- `react-native-android-widget`. Íconos = `SvgWidget` con SVGs en
  `androidIcons.ts` (color horneado en el `stroke`, no se re-tinta en runtime).
- **Headless task** (`registerWidgetTask.ts`) registrado desde el entry point
  custom `index.js` (`package.json` → `"main"`), para que exista aunque la app no
  monte nada. **El payload trae `widgetName`/`width`/`height` anidados en
  `widgetInfo`**, no sueltos — si se desestructuran del nivel superior, los 4
  widgets renderizan "Hoy".
- **Refresco desde foreground**: `src/widget/refreshWidgets.ts` →
  `refreshWidgets()`, llamado al final de `dayItemsStore.reload`/`toggleComplete`/
  `toggleHabitComplete` (+ Deshacer)/`remove` (+ Deshacer)/`clearVoiceMemoAudio` y
  de `inboxStore.scheduleToday`/`bulkScheduleToday`. Quick Add/`ItemDetailSheet`
  quedan cubiertos porque llaman `reload()`. Todo va en un try/catch silencioso:
  nunca debe romper la mutación que lo disparó.
- **Tamaño adaptable**: un solo widget que se adapta al tamaño real (no varios
  widgets por tamaño). `widgetContentScale(width, height)` (`widgetScale.ts`,
  referencia 172dp) escala tipografía/íconos/gaps en los 4, y
  `pickVisibleItemCount(heightDp, total, scale)` decide cuántas filas entran en
  Hoy/Hábitos (menos filas más grandes en un widget grande). El tamaño llega por
  `WidgetInfo` en `requestWidgetUpdate` y en `WIDGET_RESIZED`. `maxResizeWidth`/
  `maxResizeHeight` = 400dp. Cada launcher decide el tamaño real (Samsung dio
  401×226dp a un 4x2); `minWidth`/`targetCellWidth` son solo hints.
- **Interactividad**: el checkbox de cada task en Hoy y el ícono de cada fila en
  Hábitos usan `clickAction` custom `"TOGGLE_TASK"`/`"TOGGLE_HABIT"` +
  `clickActionData: {id}` (distintos de `"OPEN_APP"`/`"OPEN_URI"`, que resuelve el
  sistema nativo). La raíz sigue con `OPEN_APP`. El headless maneja
  `WIDGET_CLICK` → `widgetActions.ts` (`toggleTaskCompleteFromWidget`/
  `toggleHabitCompleteFromWidget`, sin Zustand) y re-renderiza esa instancia. Sin
  Undo. Limitación: solo se refresca la instancia tocada; las demás esperan su
  ciclo (30 min) o la próxima mutación en foreground.
- Si Metro tira "Unable to resolve module" de un archivo que existe tras instalar
  una dependencia nueva (esta librería bundlea su TS fuente), es caché de un Metro
  viejo: matar ese proceso (`ss -ltnp | grep 808x`) y relanzar con `--clear`.

### iOS (agregado, SIN VERIFICAR)

Este entorno es Linux sin Xcode; nada de iOS se compiló ni probó. `@bacons/
apple-targets` genera el target: `targets/widget/expo-target.config.js` (App Group
`widgetAppGroup` de `app.config.ts`, uno por variant) + un archivo Swift por widget
+ `WidgetShared.swift` (paleta, `appGroup`, datos compartidos; `private` en Swift es
por archivo) + `MeldWidgetBundle.swift` (único `@main`). Lee `UserDefaults(suiteName:)`
con las claves que escribe `refreshWidgets.ts` vía `ExtensionStorage`. 3 tamaños
fijos de WidgetKit (`itemLimit` Small 1 / Medium 4 / Large 8), SF Symbols por tipo.
App Group y scheme están **hardcodeados al variant `dev`** (ver `TODO` en Swift).
Sin interactividad todavía (requiere `Button(intent:)` + App Intents, iOS 17+).
Antes de darlo por terminado: `npx expo prebuild -p ios --clean` + `xed ios` en una
Mac y probar en simulador/dispositivo.

## Onboarding

Carrusel horizontal de 6 slides + un paso de Notificaciones fuera del carrusel. Se
muestra una sola vez (`settingsStore.onboardingCompleted`, persistido); no hay fila
en Ajustes para repetirlo. En dev: `adb shell pm clear app.meld.mobile`. El
alcance es visual/animación: sin preguntas de personalización.

**Slides** (`features/onboarding/onboardingSlides.ts` → `SLIDES`): Bienvenida
(`welcome`: logo con rebote + glow `RadialGradient` + wordmark + textos
`FadeInDown`), Hoy, Hábitos, Momentos, Calendario (`mock`) y Planes (`plans`).

**Arquitectura** (`src/features/onboarding/`):
- `OnboardingScreen.tsx`: `Animated.ScrollView` horizontal `pagingEnabled`,
  `scrollX` vía `useAnimatedScrollHandler`, `page` en `onMomentumScrollEnd`. Chrome
  superior (flecha atrás `chevron-left`, oculta en el slide 0 + barra de progreso
  segmentada `OnboardingProgress.tsx`, `marginTop:30`) y botón inferior son
  absolutos. `phase: 'slides'|'notif'`.
- **`NotificationsStep` es un overlay `StyleSheet.absoluteFill`** sobre el
  carrusel, no un `return` aparte: desmontar el pager pierde su offset y al volver
  el slide queda en blanco.
- `onboardingTheme.ts` → `ONB`: paleta/tipografía fijas oscuras (`#121212` fondo,
  `#FA3D5C` acento, `#F5F5F7` texto; los nombres de token como `textDark` se
  conservaron aunque ahora son claros). No lee `ThemeProvider`. `StatusBar
  style="light"`.
- `components/PhoneMock.tsx`: mockup enmarcado + acento animado (badge centrado en
  `slide.accent.x/y`, `scale?` opcional, anillo pulsante) sobre la acción real de
  cada pantalla. Mide su hueco con `onLayout`. Encuadres (`slide.framing`):
  `'portrait'` (ancho `box.width * 1.24`, anclado arriba) y `'wide'` (Hábitos,
  `* 1.35`, anclado abajo), con `overflow:hidden`. **Nunca `aspectRatio` + ancho
  %** (Yoga deja la imagen gigante/pixelada): px explícitos desde `box` +
  `slide.ratio`. Animaciones solo Reanimated: `float` (±6), `enter` (0.95→1) al
  volverse activo, pulso con `withRepeat`.
- Layout de slide de mock: `headerArea` (flex:1, `maxWidth:280`, título 26 /
  subtítulo 15.5) + `mockArea` (flex:1.9).

**Mockups** (`assets/onboarding/mock-{today,habits,moments,calendar,inbox}.png`,
exports de shots.so a partir de capturas reales con el seed): `today`/`moments`/
`calendar`/`inbox` van en un lienzo de 893×1340 con el teléfono en la misma
posición (bbox opaco (173,62)-(714,1179)), así se ven del mismo tamaño en el
onboarding y en la landing. Al reemplazar uno, normalizarlo con PIL: bbox de alfa
> 200 pegado en un lienzo 893×1340 en (173,62). `habits` usa un recorte más ancho
(ratio ≈ 1.015, `framing:'wide'`). `mock-moments.png` es la versión con grupos
por semana, a elección del usuario. En shots.so usar preset RECTO (la perspectiva
no calza con el acento). `assets/onboarding-today-{device,screenshot}.png` ya no
se usan y se pueden borrar.

**Botón inferior**: flota sobre un `LinearGradient` scrim y el mockup sangra por
detrás. Debajo, el enlace "Saltar" va directo a Notificaciones. Ambos se ocultan
en Planes.

**Planes** (`PlansSlide.tsx`, igual en dev/test/prod): logo + título/subtítulo + 4
features Pro (claves `onbPlanProF{1..4}`/`…Desc`) + un solo botón "Empezar gratis"
(`setPlan('free')` → Notificaciones) + "Las funciones Pro llegan pronto" + footer
Términos · Privacidad (`constants/links.ts`). Las opciones de prueba/compra vuelven
cuando haya cobro real (ver `docs/play-store-checklist.md`).
`settingsStore.plan: 'free'|'pro'` es un flag local, sin RevenueCat ni gating.

**Prueba de Pro SIMULADA** (sin cobro): `settingsStore.trialStartedAt` +
`domain/trial.ts`. `expireTrialIfDue()` corre al montar `RootStack` y al volver a
primer plano (`TrialEndedDialog.tsx`): si venció, pasa a Free y muestra un
`ConfirmDialog` "Tu prueba de Pro terminó" (Seguir con Free / Suscribirme →
`subscribePro()`). Ajustes tiene una sección **Plan** y, solo en dev/test, una fila
para empezar la prueba (único lugar), vencerla ya (`simulateTrialExpired()`, el
aviso sale al reabrir) o volver a Free. Con una tienda real, una prueba pide método
de pago: un texto tipo "Sin tarjeta ahora" no sería cierto.

**Notificaciones** (`slides/NotificationsStep.tsx`): campana con anillos +
"Activar recordatorios" → `requestNotificationPermission()` (try/catch) +
`onDone()`; "Ahora no" → `onDone()`. Tiene su propia flecha atrás.

## Landing page (`landing/`)

Next.js 16 (App Router) + Tailwind v4, proyecto npm APARTE (no workspace).
`metro.config.js` la excluye (`resolver.blockList`) y el `tsconfig.json` raíz tiene
`"exclude": ["landing"]`. Oscuro de marca, bilingüe `/es` + `/en`, CTA = lista de
espera, Pro "Próximamente". **Esta versión de Next cambió APIs** (p. ej. `proxy.ts`
en vez de `middleware.ts`, `params` como Promise) — leer
`landing/node_modules/next/dist/docs/` antes de tocar código. La portada tiene la
pantalla Hoy funcionando en el navegador (`landing/src/demo/`) con una COPIA de
`src/domain/voiceParser.ts`: si cambia el parser de la app, copiar el cambio. La
lista de espera usa Resend (`RESEND_API_KEY`; sin ella, producción responde 503 a
propósito). Deploy en Vercel (proyecto `meld`, `usemeld.vercel.app`) conectado a
`JhonnyXT/meld-app` con `Root Directory: landing` — cada push a `main` despliega.
Detalle en `landing/README.md`.

## Publicar en Google Play

Checklist completo en `docs/play-store-checklist.md` — leerlo antes de cualquier
tarea de publicación. `prod` genera AAB; permisos de cámara/galería bloqueados
(`app.config.ts` → `blockedPermissions`, `expo-image-picker` `cameraPermission:
false` — Momentos usa el Photo Picker sin permiso).

## Roadmap Pro

Lo que el código ya deja preparado para Pro pero NO está implementado. El tier Pro
completo (backup/sync en la nube, sync con Google Calendar/Outlook, Pomodoro,
widgets avanzados + Live Activities, IA, etc.) está en el artifact del spec —
releerlo antes de empezar cualquiera de estas.

- **Quick Add en lenguaje natural**: la versión offline (`voiceParser.ts`) es
  gratis para todos — no gatearla por `plan`. Lo Pro es la versión con IA
  (multi-ítem, más precisa, NL escrito).
- **Auto-registro real (Health/Fit)**: hoy elegir una métrica solo cambia ícono y
  orden; el check es manual. Lo Pro: con Apple Health/Google Fit conectados, marcar
  solo al cumplir la meta (lectura on-device), manteniendo el check manual para
  corregir. Anotado en `Habit.autoTrack` (`domain/dayItem.ts`) y en
  `autoTrackProNote`. Implementarlo implica HealthKit/Health Connect, lectura en
  background, y llamar a lo mismo que `dayItemsStore.toggleHabitComplete` — no un
  mecanismo paralelo.
- **Monetización (RevenueCat)**: `settingsStore.plan` y la prueba simulada existen,
  pero no hay RevenueCat, paywall ni gating. Con la tienda, la fuente de verdad pasa
  a ser la suscripción.

## Simplificaciones conocidas (no son bugs)

- Los hábitos NO recurren en Calendar Mes ni en la agenda Semana (ahí se ven solo
  en su fecha de creación), y el tap-to-complete solo está en Today. Extenderlo
  implicaría que `useWeekAgenda`/`listByDateRange` inyecten ocurrencias como
  `dayItemsStore.reload`.
- `Event` no soporta multi-día (solo `startTime`/`endTime` del mismo día).
- **`FlashList` solo en `InboxScreen`**. Today, agenda Semana y Moments son listas
  acotadas y siguen con `ScrollView`: el reciclado de `FlashList` no es compatible
  con las animaciones de salida por fila de Today. No migrarlas sin que se pida.
- Moments guarda la URI de `expo-image-picker` sin copiarla a almacenamiento propio.
- Presets fijos (`PresetFieldRow`) a propósito: Repetir y Alerta previa de Event,
  Hora preferida y Auto-track de Habit.

## Gotchas del entorno

- Otro proyecto Expo (`my-wallet-app`) usa Metro en el 8081 permanentemente —
  nunca matarlo. Usar `--port 8082`+ y `adb reverse tcp:8081 tcp:<puerto>`.
- `adb` pierde el daemon entre invocaciones de Bash separadas: levantar `adb
  nodaemon server -a` dentro de la MISMA invocación (detalle en el skill).
- **App trabada en el splash nativo (variant `dev`)**: casi siempre se perdió el
  `adb reverse` (se borra al reiniciar el servidor de adb). Confirmar con `adb
  reverse --list` o logcat (`failed to connect to localhost/127.0.0.1 (port
  8081)`), recrearlo y relanzar.
- **Pantalla gris/negra justo después de relanzar no es un bug**: en el Moto E7
  Plus un bundle en frío tarda ~15s en Metro y otros 10-20s en el device.
  Confirmar con `adb logcat -d | grep "ReactNativeJS: Running"` y esperar ~15-20s
  más antes de diagnosticar. `RetryableMountingLayerException` en ese arranque es
  ruido.
- Reanimated 4.x necesita `react-native-worklets` explícito, y `babel-preset-expo`
  en el `node_modules` raíz.
- **Un `GestureDetector` dentro de un `<Modal>` no recibe toques en Android** (el
  `GestureHandlerRootView` de la raíz no cubre la ventana del Modal; falla sin
  error). Envolver el contenido de cada Modal con gestos en su propio
  `GestureHandlerRootView style={{flex:1}}` — ya hecho en `QuickAddSheet`,
  `ItemDetailSheet` y `CategoryFormModal`. Revisar esto primero si un gesto nuevo
  en otro Modal "no hace nada".
- **Desde un worklet (callbacks de gesto) no llamar a una función JS que no sea
  worklet** — revienta con "Tried to synchronously call a Remote Function". El
  cálculo va inline; solo lo que toca estado de React pasa por `runOnJS(...)`.
- El tema por defecto es `'system'`: la app puede verse en claro en el celular;
  la paleta clara está en uso real.

## Verificación en dispositivo

Después de una tanda corta de verificación propia (compilar, instalar, un par de
capturas para confirmar que no se rompió nada), **entregarle al usuario pasos
concretos para que pruebe él** y reporte, en vez de manejar el celular turno a
turno con `adb shell input tap/swipe` + capturas (consume muchos tokens). Sí vale
recompilar/reinstalar cada vez que cambia el código.
