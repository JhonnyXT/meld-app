import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Linking,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { Icon } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useItemDetailStore } from '@/store/itemDetailStore';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { useInboxStore } from '@/store/inboxStore';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { syncReminderNotification } from '@/services/notifications';
import { toDateKey } from '@/domain/date';
import { minutesToHour24, hour24ToMinutes, ANY_TIME_HHMM, ANY_TIME_MINUTES } from '@/domain/time';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { FieldRow } from '@/components/quickAdd/FieldRow';
import { PresetFieldRow } from '@/components/quickAdd/PresetFieldRow';
import { TimeFieldRow } from '@/components/quickAdd/TimeFieldRow';
import { HealthAutoTrackFieldRow } from '@/components/quickAdd/HealthAutoTrackFieldRow';
import { DateFieldRow } from '@/components/quickAdd/DateFieldRow';
import { DurationFieldRow } from '@/components/quickAdd/DurationFieldRow';
import { CategoryChips } from '@/components/quickAdd/CategoryChips';
import { PriorityTabs } from '@/components/quickAdd/PriorityTabs';
import { TypeTabs } from '@/components/quickAdd/TypeTabs';
import { VoiceRecordRow } from '@/components/quickAdd/VoiceRecordRow';
import {
  QUICK_ADD_META,
  type QuickAddType,
  REPEAT_OPTIONS,
  EARLY_ALERT_OPTIONS,
  HABIT_SCHEDULE_OPTIONS,
  HABIT_PREFERRED_TIME_OPTIONS,
  labelToHour24,
  addMinutesToHour24,
  earlyAlertToMinutes,
  frequencyTarget,
} from '@/domain/quickAdd';
import { formatDuration } from '@/features/today/mapDayItemToRow';
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

export function ItemDetailSheet() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const itemId = useItemDetailStore((s) => s.itemId);
  const close = useItemDetailStore((s) => s.close);

  const [item, setItem] = useState<DayItem | null>(null);
  const [type, setType] = useState<QuickAddType>('task');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'inbox' | 'scheduled' | 'done'>('scheduled');
  const [category, setCategory] = useState<{ label: string; color: string } | null>(null);
  const [priority, setPriority] = useState<PriorityLevel>('none');
  const [dateKey, setDateKey] = useState<string | null>(toDateKey(new Date()));

  const [taskReminderMinutes, setTaskReminderMinutes] = useState<number | null>(null);
  const [taskRepeat, setTaskRepeat] = useState('Never');

  const [eventStartMinutes, setEventStartMinutes] = useState(9 * 60);
  const [eventDurationMinutes, setEventDurationMinutes] = useState(60);
  const [eventEarlyAlert, setEventEarlyAlert] = useState('Off');

  const [voiceReminderMinutes, setVoiceReminderMinutes] = useState<number | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const recorder = useVoiceRecorder();

  const [noteReminderMinutes, setNoteReminderMinutes] = useState<number | null>(null);

  const [habitSchedule, setHabitSchedule] = useState(HABIT_SCHEDULE_OPTIONS[0]);
  const [habitPreferredTime, setHabitPreferredTime] = useState('Anytime');
  const [habitHealthMetric, setHabitHealthMetric] = useState<string | null>(null);
  const [habitHealthMetricTarget, setHabitHealthMetricTarget] = useState<number | null>(null);

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
    setHabitSchedule(HABIT_SCHEDULE_OPTIONS[0]);
    setHabitPreferredTime('Anytime');
    setHabitHealthMetric(null);
    setHabitHealthMetricTarget(null);
  };

  const handleToggleRecording = async () => {
    try {
      if (recorder.isRecording) {
        const result = await recorder.stop();
        if (result) {
          setRecordedUri(result.uri);
          setRecordedSeconds(result.durationSeconds);
        }
      } else {
        const granted = await recorder.start();
        if (!granted) {
          Alert.alert(t('micPermissionDeniedTitle'), t('micPermissionDeniedMessage'));
        }
      }
    } catch (error) {
      console.error('[ItemDetail] voice recording failed', error);
      Alert.alert(t('recordingErrorTitle'), t('recordingErrorMessage'));
    }
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

      if (loaded.type === 'task') {
        setTaskReminderMinutes(reminderMinutesOrNull(loaded.reminderAt));
        setTaskRepeat(loaded.repeatRule ?? 'Never');
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
      } else if (loaded.type === 'habit') {
        setHabitSchedule(loaded.targetFrequency);
        setHabitPreferredTime('Anytime');
        setHabitHealthMetric(loaded.healthMetric);
        setHabitHealthMetricTarget(loaded.healthMetricTarget);
      }
    });
  }, [itemId]);

  if (!item) return <Modal visible={!!itemId} transparent animationType="fade" />;

  const handleSave = async () => {
    if (item.type === 'moment') {
      // Moments no se editan desde esta hoja.
      close();
      return;
    }

    const now = new Date().toISOString();
    const categoryLabel = category?.label ?? null;
    const categoryColor = category?.color ?? null;
    // Si se saca de Inbox asignándole fecha, pasa a agendado; si se manda a Inbox
    // (sin fecha), vuelve a 'inbox'. Un task ya marcado "done" no se reabre por esto.
    const finalStatus: 'inbox' | 'scheduled' | 'done' = dateKey === null ? 'inbox' : status === 'inbox' ? 'scheduled' : status;
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
        link: item.type === 'task' ? item.link : null,
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
        richTextBody: item.type === 'note' ? item.richTextBody : '',
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

  const meta = QUICK_ADD_META[type];
  const typeLabel = t(meta.tabLabelKey);
  const hasLink = type === 'task' && item.type === 'task' && !!item.link;
  const saveDisabled = type === 'voiceMemo' && !recordedUri;

  return (
    <Modal visible={!!itemId} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: palette.surfaceHigh }]} />

          <View style={styles.header}>
            <Text style={{ fontFamily: font.extrabold, fontSize: 24, color: palette.text }}>{typeLabel}</Text>
            <Pressable
              onPress={close}
              style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}
              accessibilityRole="button"
              accessibilityLabel={t('a11yCloseSheet')}
            >
              <Icon name="close" size={20} color={palette.textDim} />
            </Pressable>
          </View>

          {item.type !== 'moment' ? <TypeTabs value={type} onChange={handleTypeChange} /> : null}

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.titleRow}>
              {type === 'task' ? (
                <Pressable
                  onPress={() => setStatus(status === 'done' ? 'scheduled' : 'done')}
                  style={[
                    styles.checkBox,
                    {
                      borderColor: status === 'done' ? palette.accent : palette.border,
                      backgroundColor: status === 'done' ? palette.accent : 'transparent',
                    },
                  ]}
                >
                  {status === 'done' ? <Icon name="check" size={16} color="#fff" /> : null}
                </Pressable>
              ) : null}
              <View style={[styles.inputBox, { flex: 1, backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t(meta.placeholderKey)}
                  placeholderTextColor={palette.textDim}
                  autoCorrect={false}
                  spellCheck={false}
                  style={{ fontFamily: font.medium, fontSize: 16, color: palette.text, padding: 0 }}
                />
              </View>
            </View>

            {hasLink && item.type === 'task' && item.link ? (
              <Pressable
                onPress={() => Linking.openURL(item.link!)}
                style={[styles.linkCard, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}
              >
                <View style={[styles.linkIcon, { backgroundColor: palette.surfaceHigh }]}>
                  <Icon name="link" size={18} color={palette.textDim} />
                </View>
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.regular, fontSize: 13, color: palette.textDim }}>
                  {item.link}
                </Text>
                <Icon name="north-east" size={16} color={palette.textDim} />
              </Pressable>
            ) : null}

            <View style={[styles.configBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
              <View>
                <DateFieldRow
                  icon="calendar-month"
                  label={t('fieldDate')}
                  dateKey={dateKey}
                  onChange={setDateKey}
                  allowInbox
                  showBorder
                />

                {type === 'task' && (
                  <>
                    <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={taskReminderMinutes} onChange={setTaskReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime />
                    <PresetFieldRow icon="repeat" label={t('fieldRepeat')} options={REPEAT_OPTIONS} value={taskRepeat} onChange={setTaskRepeat} lang={lang} />
                  </>
                )}

                {type === 'event' && (
                  <>
                    <TimeFieldRow icon="schedule" label={t('fieldStarts')} minutes={eventStartMinutes} onChange={(m) => setEventStartMinutes(m ?? eventStartMinutes)} offLabel="" />
                    <DurationFieldRow icon="schedule" label={t('fieldDuration')} minutes={eventDurationMinutes} onChange={setEventDurationMinutes} />
                    <PresetFieldRow icon="notifications" label={t('fieldEarlyAlert')} options={EARLY_ALERT_OPTIONS} value={eventEarlyAlert} onChange={setEventEarlyAlert} lang={lang} />
                  </>
                )}

                {type === 'voiceMemo' && (
                  <>
                    {item.type === 'voiceMemo' ? (
                      <FieldRow icon="graphic-eq" label={t('fieldRecorded')} value={item.audioFileUri ? formatDuration(item.durationSeconds) : t('audioDeleted')} onPress={() => {}} />
                    ) : (
                      <VoiceRecordRow
                        isRecording={recorder.isRecording}
                        durationSeconds={recorder.isRecording ? recorder.durationSeconds : recordedSeconds}
                        hasRecording={!!recordedUri}
                        onPress={handleToggleRecording}
                      />
                    )}
                    <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={voiceReminderMinutes} onChange={setVoiceReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime />
                  </>
                )}

                {type === 'note' && (
                  <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={noteReminderMinutes} onChange={setNoteReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime />
                )}

                {type === 'habit' && (
                  <>
                    <PresetFieldRow icon="repeat" label={t('fieldSchedule')} options={HABIT_SCHEDULE_OPTIONS} value={habitSchedule} onChange={setHabitSchedule} lang={lang} />
                    <PresetFieldRow icon="schedule" label={t('fieldPreferredTime')} options={HABIT_PREFERRED_TIME_OPTIONS} value={habitPreferredTime} onChange={setHabitPreferredTime} lang={lang} />
                    <HealthAutoTrackFieldRow
                      icon="favorite"
                      label={t('fieldAutoTrack')}
                      metricId={habitHealthMetric}
                      target={habitHealthMetricTarget}
                      onChange={(nextId, nextTarget) => {
                        setHabitHealthMetric(nextId);
                        setHabitHealthMetricTarget(nextTarget);
                      }}
                    />
                  </>
                )}
              </View>

              <CategoryChips value={category?.label ?? null} onChange={(label, color) => setCategory({ label, color })} showBorder />
              <PriorityTabs value={priority} onChange={setPriority} />
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saveDisabled}
              style={[styles.cta, { backgroundColor: palette.accent, opacity: saveDisabled ? 0.5 : 1 }]}
            >
              <Icon name="check" size={20} color="#fff" />
              <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#fff' }}>{t(meta.ctaUpdateKey)}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, maxHeight: '90%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inputBox: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  linkIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  configBox: {
    borderRadius: 24,
    padding: 20,
    gap: 24,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 20, marginBottom: 8 },
});
