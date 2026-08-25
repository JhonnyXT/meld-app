import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { Icon } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useQuickAddStore } from '@/store/quickAddStore';
import { useDayItemsStore } from '@/store/dayItemsStore';
import { useInboxStore } from '@/store/inboxStore';
import { dayItemRepository } from '@/data/local/dayItemRepository';
import { syncReminderNotification } from '@/services/notifications';
import { toDateKey, addDays } from '@/domain/date';
import { minutesToHour24, ANY_TIME_HHMM, ANY_TIME_MINUTES } from '@/domain/time';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { TypeTabs } from './TypeTabs';
import { PresetFieldRow } from './PresetFieldRow';
import { TimeFieldRow } from './TimeFieldRow';
import { HealthAutoTrackFieldRow } from './HealthAutoTrackFieldRow';
import { DateFieldRow } from './DateFieldRow';
import { DurationFieldRow } from './DurationFieldRow';
import { CategoryChips } from './CategoryChips';
import { PriorityTabs } from './PriorityTabs';
import { VoiceRecordRow } from './VoiceRecordRow';
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
import type { DayItem, PriorityLevel } from '@/domain/dayItem';

const DEFAULT_EVENT_START_MINUTES = 16 * 60 + 30; // 4:30 PM, mismo default que antes

/** `minutes` (null = apagado, `ANY_TIME_MINUTES` = sin hora puntual, o
 * minutos reales) -> `reminderAt` para el `dateKey` dado. */
function reminderAtFromMinutes(dateKey: string, minutes: number | null): string | null {
  if (minutes === null) return null;
  const hhmm = minutes === ANY_TIME_MINUTES ? ANY_TIME_HHMM : minutesToHour24(minutes);
  return `${dateKey}T${hhmm}:00.000Z`;
}

export function QuickAddSheet() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const visible = useQuickAddStore((s) => s.visible);
  const initialType = useQuickAddStore((s) => s.initialType);
  const close = useQuickAddStore((s) => s.close);

  const [type, setType] = useState<QuickAddType>(initialType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<{ label: string; color: string } | null>(null);
  const [priority, setPriority] = useState<PriorityLevel>('none');

  // Task
  const [taskReminderMinutes, setTaskReminderMinutes] = useState<number | null>(null);
  const [taskRepeat, setTaskRepeat] = useState(REPEAT_OPTIONS[0]);

  // Event
  const [eventStartMinutes, setEventStartMinutes] = useState(DEFAULT_EVENT_START_MINUTES);
  const [eventDurationMinutes, setEventDurationMinutes] = useState(60);
  const [eventEarlyAlert, setEventEarlyAlert] = useState('10 min before');

  // Voice memo
  const [voiceReminderMinutes, setVoiceReminderMinutes] = useState<number | null>(null);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const recorder = useVoiceRecorder();

  // Note
  const [noteReminderMinutes, setNoteReminderMinutes] = useState<number | null>(null);
  const [noteDateKey, setNoteDateKey] = useState(toDateKey(new Date()));

  // Habit
  const [habitSchedule, setHabitSchedule] = useState(HABIT_SCHEDULE_OPTIONS[0]);
  const [habitPreferredTime, setHabitPreferredTime] = useState(HABIT_PREFERRED_TIME_OPTIONS[0]);
  const [habitHealthMetric, setHabitHealthMetric] = useState<string | null>(null);
  const [habitHealthMetricTarget, setHabitHealthMetricTarget] = useState<number | null>(null);

  const resetForm = (nextType: QuickAddType) => {
    setType(nextType);
    setTitle('');
    setCategory(null);
    setPriority('none');
    setTaskReminderMinutes(null);
    setTaskRepeat(REPEAT_OPTIONS[0]);
    setEventStartMinutes(DEFAULT_EVENT_START_MINUTES);
    setEventDurationMinutes(60);
    setEventEarlyAlert('10 min before');
    setVoiceReminderMinutes(null);
    setRecordedUri(null);
    setRecordedSeconds(0);
    setNoteReminderMinutes(null);
    setNoteDateKey(toDateKey(new Date()));
    setHabitSchedule(HABIT_SCHEDULE_OPTIONS[0]);
    setHabitPreferredTime(HABIT_PREFERRED_TIME_OPTIONS[0]);
    setHabitHealthMetric(null);
    setHabitHealthMetricTarget(null);
  };

  useEffect(() => {
    if (visible) resetForm(initialType);
  }, [visible, initialType]);

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
      console.error('[QuickAdd] voice recording failed', error);
      Alert.alert(t('recordingErrorTitle'), t('recordingErrorMessage'));
    }
  };

  const refreshLists = () => {
    useDayItemsStore.getState().reload();
    useInboxStore.getState().reload();
  };

  const handleSave = async () => {
    const now = new Date().toISOString();
    const todayKey = toDateKey(new Date());
    const id = `${type}-${Date.now()}`;
    const categoryLabel = category?.label ?? null;
    const categoryColor = category?.color ?? null;

    let item: DayItem;

    if (type === 'task') {
      const reminderAt = reminderAtFromMinutes(todayKey, taskReminderMinutes);
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: todayKey,
        title: title.trim() || t('untitledTask'),
        category: categoryLabel,
        categoryColor,
        reminderAt,
        status: 'scheduled',
        type: 'task',
        priority,
        repeatRule: taskRepeat === 'Never' ? null : taskRepeat,
        link: null,
      };
    } else if (type === 'event') {
      const start24 = minutesToHour24(eventStartMinutes);
      const end24 = addMinutesToHour24(start24, eventDurationMinutes);
      const alertMinutes = earlyAlertToMinutes(eventEarlyAlert);
      const reminderAt = alertMinutes != null ? `${todayKey}T${addMinutesToHour24(start24, -alertMinutes)}:00.000Z` : null;
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: todayKey,
        title: title.trim() || t('untitledEvent'),
        category: categoryLabel,
        categoryColor,
        reminderAt,
        status: 'scheduled',
        type: 'event',
        priority,
        startTime: start24,
        endTime: end24,
        calendarSource: null,
      };
    } else if (type === 'voiceMemo') {
      const reminderAt = reminderAtFromMinutes(todayKey, voiceReminderMinutes);
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: todayKey,
        title: title.trim() || t('untitledVoiceNote'),
        category: categoryLabel,
        categoryColor,
        reminderAt,
        status: 'scheduled',
        type: 'voiceMemo',
        priority,
        audioFileUri: recordedUri ?? '',
        durationSeconds: recordedSeconds,
      };
    } else if (type === 'note') {
      const dateKey = noteDateKey;
      const reminderAt = reminderAtFromMinutes(dateKey, noteReminderMinutes);
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: dateKey,
        title: title.trim() || t('untitledNote'),
        category: categoryLabel,
        categoryColor,
        reminderAt,
        status: 'scheduled',
        type: 'note',
        priority,
        richTextBody: '',
      };
    } else {
      const hasTime = habitPreferredTime !== 'Anytime';
      const reminderAt = hasTime ? `${todayKey}T${labelToHour24(habitPreferredTime)}:00.000Z` : null;
      const target = frequencyTarget(habitSchedule);
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: todayKey,
        title: title.trim() || t('untitledHabit'),
        category: categoryLabel,
        categoryColor,
        reminderAt,
        status: 'scheduled',
        type: 'habit',
        priority,
        targetFrequency: habitSchedule,
        currentStreak: 0,
        progress: `0/${target}`,
        autoTrack: habitHealthMetric !== null,
        healthMetric: habitHealthMetric,
        healthMetricTarget: habitHealthMetricTarget,
        colorStyle: habitHealthMetric !== null ? 'cool' : 'default',
      };
    }

    await dayItemRepository.upsert(item);
    await syncReminderNotification(item);
    refreshLists();
    close();
  };

  const meta = QUICK_ADD_META[type];
  const saveDisabled = type === 'voiceMemo' && !recordedUri;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: palette.surfaceHigh }]} />

          <View style={styles.header}>
            <Text style={{ fontFamily: font.extrabold, fontSize: 24, color: palette.text }}>{t(meta.sheetTitleKey)}</Text>
            <Pressable
              onPress={close}
              style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}
              accessibilityRole="button"
              accessibilityLabel={t('a11yCloseSheet')}
            >
              <Icon name="close" size={20} color={palette.textDim} />
            </Pressable>
          </View>

          <TypeTabs value={type} onChange={resetForm} />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.inputBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
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

            <View style={[styles.configBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
              {type === 'task' && (
                <View style={styles.fieldGroup}>
                  <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={taskReminderMinutes} onChange={setTaskReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime />
                  <PresetFieldRow icon="repeat" label={t('fieldRepeat')} options={REPEAT_OPTIONS} value={taskRepeat} onChange={setTaskRepeat} lang={lang} />
                </View>
              )}

              {type === 'event' && (
                <View style={styles.fieldGroup}>
                  <TimeFieldRow icon="schedule" label={t('fieldStarts')} minutes={eventStartMinutes} onChange={(m) => setEventStartMinutes(m ?? DEFAULT_EVENT_START_MINUTES)} offLabel="" />
                  <DurationFieldRow icon="schedule" label={t('fieldDuration')} minutes={eventDurationMinutes} onChange={setEventDurationMinutes} />
                  <PresetFieldRow icon="notifications" label={t('fieldEarlyAlert')} options={EARLY_ALERT_OPTIONS} value={eventEarlyAlert} onChange={setEventEarlyAlert} lang={lang} />
                </View>
              )}

              {type === 'voiceMemo' && (
                <View style={styles.fieldGroup}>
                  <VoiceRecordRow
                    isRecording={recorder.isRecording}
                    durationSeconds={recorder.isRecording ? recorder.durationSeconds : recordedSeconds}
                    hasRecording={!!recordedUri}
                    onPress={handleToggleRecording}
                  />
                  <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={voiceReminderMinutes} onChange={setVoiceReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime />
                </View>
              )}

              {type === 'note' && (
                <View style={styles.fieldGroup}>
                  <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={noteReminderMinutes} onChange={setNoteReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime />
                  <DateFieldRow icon="calendar-month" label={t('fieldDay')} dateKey={noteDateKey} onChange={(k) => setNoteDateKey(k ?? noteDateKey)} />
                </View>
              )}

              {type === 'habit' && (
                <View style={styles.fieldGroup}>
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
                </View>
              )}

              <CategoryChips value={category?.label ?? null} onChange={(label, color) => setCategory({ label, color })} showBorder />
              <PriorityTabs value={priority} onChange={setPriority} />
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saveDisabled}
              style={[styles.cta, { backgroundColor: palette.accent, opacity: saveDisabled ? 0.5 : 1 }]}
            >
              <Icon name="check" size={20} color="#fff" />
              <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#fff' }}>{t(meta.ctaAddKey)}</Text>
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
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    maxHeight: '88%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  inputBox: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
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
  fieldGroup: { gap: 0 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
});
