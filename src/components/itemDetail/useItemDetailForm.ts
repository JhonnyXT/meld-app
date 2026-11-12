import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from '@/i18n';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { useInboxStore } from '@/store/inboxStore';
import { useCategoriesStore } from '@/store/categoriesStore';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { syncReminderNotification } from '@/services/notifications';
import { toDateKey } from '@/domain/date';
import { minutesToHour24, hour24ToMinutes, ANY_TIME_HHMM, ANY_TIME_MINUTES } from '@/domain/time';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useVoiceDictation } from '@/hooks/useVoiceDictation';
import {
  QUICK_ADD_META,
  type QuickAddType,
  HABIT_SCHEDULE_OPTIONS,
  EARLY_ALERT_OPTIONS,
  labelToHour24,
  addMinutesToHour24,
  earlyAlertToMinutes,
  frequencyTarget,
} from '@/domain/quickAdd';
import type { DayItem, PriorityLevel } from '@/domain/dayItem';

/** `reminderAt` -> minutos desde medianoche (`null` = sin recordatorio,
 * `ANY_TIME_MINUTES` = con recordatorio pero sin hora puntual), para
 * pre-poblar el estado editable de `TimeFieldRow` desde un ítem existente. */
function reminderMinutesOrNull(reminderAt: string | null): number | null {
  if (!reminderAt) return null;
  const hhmm = reminderAt.slice(11, 16);
  if (hhmm === ANY_TIME_HHMM) return ANY_TIME_MINUTES;
  return hour24ToMinutes(hhmm);
}

/** `minutes` (null = apagado, `ANY_TIME_MINUTES` = sin hora puntual, o
 * minutos reales) -> `reminderAt` para el `dateKey` dado. Sin fecha (ítem en
 * Inbox) no hay recordatorio posible. */
function reminderAtFromMinutes(dateKey: string | null, minutes: number | null): string | null {
  if (dateKey === null || minutes === null) return null;
  const hhmm = minutes === ANY_TIME_MINUTES ? ANY_TIME_HHMM : minutesToHour24(minutes);
  return `${dateKey}T${hhmm}:00.000Z`;
}

/** Todo el estado y las acciones de `ItemDetailSheet` — separado del componente para que ese
 * archivo sea solo presentación (mismo patrón que `useWeekAgenda.ts` para la agenda semanal). */
export function useItemDetailForm() {
  const { t, lang } = useTranslation();
  const itemId = useItemDetailStore((s) => s.itemId);
  const close = useItemDetailStore((s) => s.close);

  const [item, setItem] = useState<DayItem | null>(null);
  const [type, setType] = useState<QuickAddType>('task');
  const [title, setTitle] = useState('');
  const dictation = useVoiceDictation(lang, setTitle);
  const [status, setStatus] = useState<'inbox' | 'scheduled' | 'done'>('scheduled');
  const [category, setCategory] = useState<{ label: string; color: string } | null>(null);
  const [priority, setPriority] = useState<PriorityLevel>('none');
  const [dateKey, setDateKey] = useState<string | null>(toDateKey(new Date()));

  const [taskReminderMinutes, setTaskReminderMinutes] = useState<number | null>(null);
  const [taskRepeat, setTaskRepeat] = useState('Never');

  // Link (task + event) — se conserva al alternar entre esos dos tipos.
  const [link, setLink] = useState('');

  const [eventStartMinutes, setEventStartMinutes] = useState(9 * 60);
  const [eventDurationMinutes, setEventDurationMinutes] = useState(60);
  const [eventEarlyAlert, setEventEarlyAlert] = useState('Off');

  const [voiceReminderMinutes, setVoiceReminderMinutes] = useState<number | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const recorder = useVoiceRecorder();

  const [noteReminderMinutes, setNoteReminderMinutes] = useState<number | null>(null);
  const [richTextBody, setRichTextBody] = useState('');

  const [habitSchedule, setHabitSchedule] = useState(HABIT_SCHEDULE_OPTIONS[0]);
  const [habitPreferredTime, setHabitPreferredTime] = useState('Anytime');
  const [habitHealthMetric, setHabitHealthMetric] = useState<string | null>(null);
  const [habitHealthMetricTarget, setHabitHealthMetricTarget] = useState<number | null>(null);

  // "Marcar completada/hecho" (footer) — a diferencia de `status` (que sirve para una task SIN
  // `repeatRule`), un hábito o una task QUE REPITE se completa por DÍA vía su propia tabla de
  // completions (mismo patrón que `dayItemsStore`), nunca tocando `status`. Acá el día relevante
  // es siempre HOY (`todayKey`) — este sheet no sabe en qué ocurrencia/día se tocó la fila que lo
  // abrió, y la inmensa mayoría de las veces se abre desde Today (que opera sobre el día actual).
  const todayKey = toDateKey(new Date());
  const [habitCompletedToday, setHabitCompletedToday] = useState(false);
  const [taskCompletedToday, setTaskCompletedToday] = useState(false);

  // Cambiar de tipo desde la hoja de detalle (p. ej. una task del Inbox que en
  // realidad era un Event) resetea SOLO los campos específicos del tipo
  // anterior a sus defaults — a diferencia de Quick Add, acá título/fecha/
  // categoría/prioridad se conservan porque el usuario está editando algo que
  // ya existe, no arrancando de cero.
  const handleTypeChange = (nextType: QuickAddType) => {
    if (nextType === type) return;
    setType(nextType);
    setTaskReminderMinutes(null);
    setTaskRepeat('Never');
    setEventStartMinutes(9 * 60);
    setEventDurationMinutes(60);
    setEventEarlyAlert('Off');
    setVoiceReminderMinutes(null);
    setRecordedUri(null);
    setRecordedSeconds(0);
    setNoteReminderMinutes(null);
    setRichTextBody('');
    setHabitSchedule(HABIT_SCHEDULE_OPTIONS[0]);
    setHabitPreferredTime('Anytime');
    setHabitHealthMetric(null);
    setHabitHealthMetricTarget(null);
  };

  const handleVoiceRecorded = (uri: string, seconds: number) => {
    setRecordedUri(uri);
    setRecordedSeconds(seconds);
  };
  const handleVoiceDelete = () => {
    setRecordedUri(null);
    setRecordedSeconds(0);
  };
  const handleVoicePermissionDenied = () => {
    Alert.alert(t('micPermissionDeniedTitle'), t('micPermissionDeniedMessage'));
  };
  const handleVoiceError = () => {
    Alert.alert(t('recordingErrorTitle'), t('recordingErrorMessage'));
  };

  useEffect(() => {
    if (!itemId) return;
    dayItemRepository.getById(itemId).then((loaded) => {
      if (!loaded) return;
      setItem(loaded);
      // Moments no se editan acá (nunca abren esta hoja, ver mapInboxItemToRow/
      // ítems de Today) — el cast es seguro en la práctica.
      setType(loaded.type === 'moment' ? 'task' : loaded.type);
      setTitle(loaded.title);
      setStatus(loaded.status);
      setCategory(loaded.category && loaded.categoryColor ? { label: loaded.category, color: loaded.categoryColor } : null);
      setPriority(loaded.priority);
      setDateKey(loaded.date);
      setLink(loaded.type === 'task' || loaded.type === 'event' ? (loaded.link ?? '') : '');

      setTaskReminderMinutes(null);
      setTaskRepeat('Never');
      setEventStartMinutes(9 * 60);
      setEventDurationMinutes(60);
      setEventEarlyAlert('Off');
      setVoiceReminderMinutes(null);
      setRecordedUri(null);
      setRecordedSeconds(0);
      setNoteReminderMinutes(null);
      setHabitSchedule(HABIT_SCHEDULE_OPTIONS[0]);
      setHabitPreferredTime('Anytime');
      setHabitHealthMetric(null);
      setHabitHealthMetricTarget(null);
      setHabitCompletedToday(false);
      setTaskCompletedToday(false);

      if (loaded.type === 'task') {
        setTaskReminderMinutes(reminderMinutesOrNull(loaded.reminderAt));
        setTaskRepeat(loaded.repeatRule ?? 'Never');
        if (loaded.repeatRule) {
          dayItemRepository.listTaskCompletionDates(loaded.id, toDateKey(new Date()), toDateKey(new Date())).then((dates) => {
            setTaskCompletedToday(dates.length > 0);
          });
        }
      } else if (loaded.type === 'event') {
        setEventStartMinutes(hour24ToMinutes(loaded.startTime));
        const minutes = hour24ToMinutes(loaded.endTime) - hour24ToMinutes(loaded.startTime);
        setEventDurationMinutes(minutes > 0 ? minutes : 60);
        if (loaded.reminderAt) {
          const alertMin = hour24ToMinutes(loaded.startTime) - hour24ToMinutes(loaded.reminderAt.slice(11, 16));
          setEventEarlyAlert(EARLY_ALERT_OPTIONS.find((o) => earlyAlertToMinutes(o) === alertMin) ?? 'Off');
        } else {
          setEventEarlyAlert('Off');
        }
      } else if (loaded.type === 'voiceMemo') {
        setVoiceReminderMinutes(reminderMinutesOrNull(loaded.reminderAt));
        setRecordedUri(loaded.audioFileUri || null);
        setRecordedSeconds(loaded.durationSeconds);
      } else if (loaded.type === 'note') {
        setNoteReminderMinutes(reminderMinutesOrNull(loaded.reminderAt));
        setRichTextBody(loaded.richTextBody ?? '');
      } else if (loaded.type === 'habit') {
        setHabitSchedule(loaded.targetFrequency);
        setHabitPreferredTime('Anytime');
        setHabitHealthMetric(loaded.healthMetric);
        setHabitHealthMetricTarget(loaded.healthMetricTarget);
        dayItemRepository.listHabitCompletionDates(loaded.id, toDateKey(new Date()), toDateKey(new Date())).then((dates) => {
          setHabitCompletedToday(dates.length > 0);
        });
      }
    });
  }, [itemId]);

  const readOnlyLabels = useCategoriesStore((s) => s.readOnlyLabels);
  // Lector de una categoría compartida (SYNC_ROADMAP.md, Fase 4) — puede VER el ítem (esta hoja
  // se sigue abriendo), pero no editar/completar/reclasificar nada. En vez de deshabilitar cada
  // campo suelto (TimeFieldRow/DateFieldRow/etc. no tienen una prop `disabled` hoy), se envuelve
  // todo el formulario editable en un `pointerEvents="none"` + opacidad — ningún cambio local
  // importa de todos modos porque `confirmDisabled` bloquea "Actualizar" más abajo.
  const readOnly = !!item?.category && readOnlyLabels.has(item.category);

  // `statusOverride` lo usa `handleMarkToggle` para una Task SIN `repeatRule` — evita el desfasaje
  // de un closure viejo que tendría `setStatus(...)` seguido de `handleSave()` en el mismo
  // handler (el `status` del render actual todavía no reflejaría el cambio).
  const handleSave = async (statusOverride?: 'inbox' | 'scheduled' | 'done') => {
    if (!item) return;
    if (item.type === 'moment') {
      // Moments no se editan desde esta hoja.
      close();
      return;
    }

    const now = new Date().toISOString();
    const categoryLabel = category?.label ?? null;
    const categoryColor = category?.color ?? null;
    const effectiveStatus = statusOverride ?? status;
    // Si se saca de Inbox asignándole fecha, pasa a agendado; si se manda a Inbox
    // (sin fecha), vuelve a 'inbox'. Un task ya marcado "done" no se reabre por esto.
    const finalStatus: 'inbox' | 'scheduled' | 'done' =
      dateKey === null ? 'inbox' : effectiveStatus === 'inbox' ? 'scheduled' : effectiveStatus;
    const base = {
      id: item.id,
      createdAt: item.createdAt,
      updatedAt: now,
      title: title.trim() || item.title,
      date: dateKey,
      status: finalStatus,
      category: categoryLabel,
      categoryColor,
      priority,
    };
    let updated: DayItem;

    // Los campos específicos de un tipo distinto al que tenía el ítem antes
    // de cambiarlo (ver `handleTypeChange`) se preservan del original cuando
    // existen (p. ej. volver de Event a Task conserva `link` si lo tenía) y
    // usan un default sensato cuando no (mismo criterio que la creación en
    // Quick Add).
    if (type === 'task') {
      const reminderAt = reminderAtFromMinutes(dateKey, taskReminderMinutes);
      updated = {
        ...base,
        type: 'task',
        reminderAt,
        repeatRule: taskRepeat === 'Never' ? null : taskRepeat,
        link: link.trim() || null,
      };
    } else if (type === 'event') {
      const start24 = minutesToHour24(eventStartMinutes);
      const end24 = addMinutesToHour24(start24, eventDurationMinutes);
      const alertMinutes = earlyAlertToMinutes(eventEarlyAlert);
      const reminderAt =
        alertMinutes != null && dateKey !== null ? `${dateKey}T${addMinutesToHour24(start24, -alertMinutes)}:00.000Z` : null;
      updated = {
        ...base,
        type: 'event',
        reminderAt,
        startTime: start24,
        endTime: end24,
        calendarSource: item.type === 'event' ? item.calendarSource : null,
        link: link.trim() || null,
      };
    } else if (type === 'voiceMemo') {
      const reminderAt = reminderAtFromMinutes(dateKey, voiceReminderMinutes);
      updated = {
        ...base,
        type: 'voiceMemo',
        reminderAt,
        audioFileUri: recordedUri ?? (item.type === 'voiceMemo' ? item.audioFileUri : ''),
        durationSeconds: recordedUri ? recordedSeconds : item.type === 'voiceMemo' ? item.durationSeconds : 0,
      };
    } else if (type === 'note') {
      const reminderAt = reminderAtFromMinutes(dateKey, noteReminderMinutes);
      updated = {
        ...base,
        type: 'note',
        reminderAt,
        richTextBody: richTextBody.trim(),
      };
    } else {
      const hasTime = habitPreferredTime !== 'Anytime' && dateKey !== null;
      const reminderAt = hasTime ? `${dateKey}T${labelToHour24(habitPreferredTime)}:00.000Z` : null;
      const currentStreak = item.type === 'habit' ? item.currentStreak : 0;
      updated = {
        ...base,
        type: 'habit',
        reminderAt,
        targetFrequency: habitSchedule,
        currentStreak,
        progress: `${currentStreak}/${frequencyTarget(habitSchedule)}`,
        autoTrack: habitHealthMetric !== null,
        healthMetric: habitHealthMetric,
        healthMetricTarget: habitHealthMetricTarget,
        colorStyle: habitHealthMetric !== null ? 'cool' : 'default',
      };
    }

    await dayItemRepository.upsert(updated);
    await syncReminderNotification(updated);
    useDayItemsStore.getState().reload();
    useInboxStore.getState().reload();
    setItem(null);
    close();
  };

  /** Botón "Marcar completada/hecho" del footer (solo Tarea/Hábito) — guarda también cualquier
   * otro campo editado en el formulario (reusa `handleSave`), así nunca se pierde una edición en
   * curso al marcar. */
  const handleMarkToggle = async () => {
    if (!item) return;
    if (type === 'habit') {
      await dayItemRepository.toggleHabitCompletion(item.id, todayKey);
      await handleSave();
      return;
    }
    if (type === 'task' && taskRepeat !== 'Never') {
      await dayItemRepository.toggleTaskCompletion(item.id, todayKey);
      await handleSave();
      return;
    }
    await handleSave(status === 'done' ? 'scheduled' : 'done');
  };

  const isDoneToday = type === 'habit' ? habitCompletedToday : type === 'task' && taskRepeat !== 'Never' ? taskCompletedToday : status === 'done';

  const meta = QUICK_ADD_META[type];
  // Mismo criterio que QuickAddSheet: sin título (o sin grabación en nota de
  // voz nueva) no se puede guardar. Un lector de categoría compartida (`readOnly`) nunca puede
  // guardar, sin importar el resto.
  const saveDisabled = readOnly || !title.trim() || (type === 'voiceMemo' && !recordedUri);

  return {
    itemId,
    close,
    lang,
    item,
    type,
    title,
    setTitle,
    dictation,
    status,
    category,
    setCategory,
    priority,
    setPriority,
    dateKey,
    setDateKey,
    taskReminderMinutes,
    setTaskReminderMinutes,
    taskRepeat,
    setTaskRepeat,
    link,
    setLink,
    eventStartMinutes,
    setEventStartMinutes,
    eventDurationMinutes,
    setEventDurationMinutes,
    eventEarlyAlert,
    setEventEarlyAlert,
    voiceReminderMinutes,
    setVoiceReminderMinutes,
    recordedUri,
    recordedSeconds,
    recorder,
    handleVoiceRecorded,
    handleVoiceDelete,
    handleVoicePermissionDenied,
    handleVoiceError,
    noteReminderMinutes,
    setNoteReminderMinutes,
    richTextBody,
    setRichTextBody,
    habitSchedule,
    setHabitSchedule,
    habitPreferredTime,
    setHabitPreferredTime,
    habitHealthMetric,
    habitHealthMetricTarget,
    setHabitHealthMetric,
    setHabitHealthMetricTarget,
    handleTypeChange,
    handleSave,
    handleMarkToggle,
    isDoneToday,
    readOnly,
    saveDisabled,
    meta,
  };
}
