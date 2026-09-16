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
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
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
import { useVoiceDictation } from '@/hooks/useVoiceDictation';
import { useSheetDragDismiss } from '@/hooks/useSheetDragDismiss';
import { TypeTabs } from './TypeTabs';
import { PresetFieldRow } from './PresetFieldRow';
import { TimeFieldRow } from './TimeFieldRow';
import { HealthAutoTrackFieldRow } from './HealthAutoTrackFieldRow';
import { DateFieldRow } from './DateFieldRow';
import { DurationFieldRow } from './DurationFieldRow';
import { LinkFieldRow } from './LinkFieldRow';
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
  const prefill = useQuickAddStore((s) => s.prefill);
  const close = useQuickAddStore((s) => s.close);
  const { gesture: dragGesture, animatedStyle: dragStyle } = useSheetDragDismiss(visible, close);

  const [type, setType] = useState<QuickAddType>(initialType);
  const [title, setTitle] = useState('');
  const dictation = useVoiceDictation(lang, setTitle);
  const [category, setCategory] = useState<{ label: string; color: string } | null>(null);
  const [priority, setPriority] = useState<PriorityLevel>('none');
  // Fecha del ítem — vale para los 6 tipos, default hoy, elegible con el
  // calendario. Quick Add nunca manda al Inbox (sin `allowInbox`); para eso
  // está el campo de captura rápida de `InboxScreen`.
  const [dateKey, setDateKey] = useState(toDateKey(new Date()));

  // Task
  const [taskReminderMinutes, setTaskReminderMinutes] = useState<number | null>(null);
  const [taskRepeat, setTaskRepeat] = useState(REPEAT_OPTIONS[0]);

  // Link (task + event)
  const [link, setLink] = useState('');

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
  const [richTextBody, setRichTextBody] = useState('');

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
    setLink('');
    setEventStartMinutes(DEFAULT_EVENT_START_MINUTES);
    setEventDurationMinutes(60);
    setEventEarlyAlert('10 min before');
    setVoiceReminderMinutes(null);
    setRecordedUri(null);
    setRecordedSeconds(0);
    setNoteReminderMinutes(null);
    setRichTextBody('');
    setDateKey(toDateKey(new Date()));
    setHabitSchedule(HABIT_SCHEDULE_OPTIONS[0]);
    setHabitPreferredTime(HABIT_PREFERRED_TIME_OPTIONS[0]);
    setHabitHealthMetric(null);
    setHabitHealthMetricTarget(null);
  };

  useEffect(() => {
    if (!visible) return;
    resetForm(initialType);
    // `prefill` viene del comando de voz/texto (`quickAddStore.openWithPrefill`
    // → `parseVoiceInput`). Se aplica DESPUÉS de `resetForm` para pisar solo
    // los campos detectados; el resto queda en su default y el usuario
    // confirma. Ver `domain/voiceParser.ts`.
    if (prefill) {
      setTitle(prefill.title);
      if (prefill.dateKey) setDateKey(prefill.dateKey);
      if (prefill.priority) setPriority(prefill.priority);
      if (prefill.category) setCategory(prefill.category);
      if (prefill.timeMinutes != null) {
        if (prefill.type === 'task') setTaskReminderMinutes(prefill.timeMinutes);
        else if (prefill.type === 'note') setNoteReminderMinutes(prefill.timeMinutes);
        else if (prefill.type === 'event') setEventStartMinutes(prefill.timeMinutes);
        else if (prefill.type === 'habit') {
          const h = prefill.timeMinutes;
          setHabitPreferredTime(h < 12 * 60 ? 'Morning' : h < 17 * 60 ? 'Afternoon' : 'Evening');
        }
      }
      if (prefill.repeat) {
        if (prefill.type === 'task') setTaskRepeat(prefill.repeat);
        else if (prefill.type === 'habit') setHabitSchedule(prefill.repeat);
      }
    }
  }, [visible, initialType, prefill]);

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

  const refreshLists = () => {
    useDayItemsStore.getState().reload();
    useInboxStore.getState().reload();
  };

  const handleSave = async () => {
    const now = new Date().toISOString();
    const id = `${type}-${Date.now()}`;
    const categoryLabel = category?.label ?? null;
    const categoryColor = category?.color ?? null;

    let item: DayItem;

    if (type === 'task') {
      const reminderAt = reminderAtFromMinutes(dateKey, taskReminderMinutes);
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: dateKey,
        title: title.trim() || t('untitledTask'),
        category: categoryLabel,
        categoryColor,
        reminderAt,
        status: 'scheduled',
        type: 'task',
        priority,
        repeatRule: taskRepeat === 'Never' ? null : taskRepeat,
        link: link.trim() || null,
      };
    } else if (type === 'event') {
      const start24 = minutesToHour24(eventStartMinutes);
      const end24 = addMinutesToHour24(start24, eventDurationMinutes);
      const alertMinutes = earlyAlertToMinutes(eventEarlyAlert);
      const reminderAt = alertMinutes != null ? `${dateKey}T${addMinutesToHour24(start24, -alertMinutes)}:00.000Z` : null;
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: dateKey,
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
        link: link.trim() || null,
      };
    } else if (type === 'voiceMemo') {
      const reminderAt = reminderAtFromMinutes(dateKey, voiceReminderMinutes);
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: dateKey,
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
        richTextBody: richTextBody.trim(),
      };
    } else {
      const hasTime = habitPreferredTime !== 'Anytime';
      const reminderAt = hasTime ? `${dateKey}T${labelToHour24(habitPreferredTime)}:00.000Z` : null;
      const target = frequencyTarget(habitSchedule);
      item = {
        id,
        createdAt: now,
        updatedAt: now,
        date: dateKey,
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
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={close} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: insets.bottom + 16 }, dragStyle]}
          >
          <GestureDetector gesture={dragGesture}>
            <View style={styles.handleGrabArea}>
              <View style={[styles.handle, { backgroundColor: palette.surfaceHigh }]} />
            </View>
          </GestureDetector>

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
                placeholder={dictation.listening ? t('listeningPlaceholder') : t(meta.placeholderKey)}
                placeholderTextColor={palette.textDim}
                autoCorrect={false}
                spellCheck={false}
                style={{ fontFamily: font.medium, fontSize: 16, color: palette.text, padding: 0, paddingRight: 36 }}
              />
              <Pressable
                onPress={dictation.toggle}
                style={[styles.micButton, { backgroundColor: dictation.listening ? palette.accent : palette.surfaceHigh }]}
                accessibilityRole="button"
                accessibilityLabel={t('a11yDictateTitle')}
              >
                <Icon name="mic" size={15} color={dictation.listening ? '#fff' : palette.textDim} />
              </Pressable>
            </View>

            {type === 'note' && (
              <View style={[styles.noteBodyBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                <TextInput
                  value={richTextBody}
                  onChangeText={setRichTextBody}
                  placeholder={t('notePlaceholderBody')}
                  placeholderTextColor={palette.textDim}
                  multiline
                  textAlignVertical="top"
                  style={{ fontFamily: font.regular, fontSize: 15, color: palette.text, minHeight: 120 }}
                />
              </View>
            )}

            <View style={[styles.configBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
              <View style={styles.fieldGroup}>
                <DateFieldRow icon="calendar-month" label={t('fieldDay')} dateKey={dateKey} onChange={(k) => setDateKey(k ?? dateKey)} />

                {type === 'task' && (
                  <>
                    <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={taskReminderMinutes} onChange={setTaskReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime />
                    <PresetFieldRow icon="repeat" label={t('fieldRepeat')} options={REPEAT_OPTIONS} value={taskRepeat} onChange={setTaskRepeat} lang={lang} />
                    <LinkFieldRow value={link} onChange={setLink} />
                  </>
                )}

                {type === 'event' && (
                  <>
                    <TimeFieldRow icon="schedule" label={t('fieldStarts')} minutes={eventStartMinutes} onChange={(m) => setEventStartMinutes(m ?? DEFAULT_EVENT_START_MINUTES)} offLabel="" />
                    <DurationFieldRow icon="schedule" label={t('fieldDuration')} minutes={eventDurationMinutes} onChange={setEventDurationMinutes} />
                    <PresetFieldRow icon="notifications" label={t('fieldEarlyAlert')} options={EARLY_ALERT_OPTIONS} value={eventEarlyAlert} onChange={setEventEarlyAlert} lang={lang} />
                    <LinkFieldRow value={link} onChange={setLink} />
                  </>
                )}

                {type === 'voiceMemo' && (
                  <>
                    <VoiceRecordRow
                      recorder={recorder}
                      recordedUri={recordedUri}
                      recordedSeconds={recordedSeconds}
                      onRecorded={handleVoiceRecorded}
                      onDelete={handleVoiceDelete}
                      onPermissionDenied={handleVoicePermissionDenied}
                      onError={handleVoiceError}
                    />
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

                <CategoryChips value={category?.label ?? null} onChange={(label, color) => setCategory({ label, color })} showBorder />
                <PriorityTabs value={priority} onChange={setPriority} />
              </View>
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
        </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
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
  // Área de agarre más alta que la barrita visual en sí (`handle`) — mismo
  // criterio que cualquier target táctil chico (hitSlop): el gesto de
  // arrastrar-para-cerrar necesita más superficie que 4px de alto para ser
  // usable con el dedo.
  handleGrabArea: { paddingTop: 12, paddingBottom: 16, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  inputBox: {
    borderRadius: 16,
    padding: 18,
    paddingBottom: 40,
    minHeight: 76,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  micButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBodyBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
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
