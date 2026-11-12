import React from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { useSheetDragDismiss } from '@/hooks/useSheetDragDismiss';
import { FieldRow } from '@/components/quickAdd/FieldRow';
import { PresetFieldRow } from '@/components/quickAdd/PresetFieldRow';
import { TimeFieldRow } from '@/components/quickAdd/TimeFieldRow';
import { HealthAutoTrackFieldRow } from '@/components/quickAdd/HealthAutoTrackFieldRow';
import { DateFieldRow } from '@/components/quickAdd/DateFieldRow';
import { DurationFieldRow } from '@/components/quickAdd/DurationFieldRow';
import { LinkFieldRow } from '@/components/quickAdd/LinkFieldRow';
import { CategoryChips } from '@/components/quickAdd/CategoryChips';
import { PriorityTabs } from '@/components/quickAdd/PriorityTabs';
import { TypeTabs } from '@/components/quickAdd/TypeTabs';
import { VoiceRecordRow } from '@/components/quickAdd/VoiceRecordRow';
import { FieldSection } from '@/components/quickAdd/FieldSection';
import { SheetActions } from '@/components/quickAdd/SheetActions';
import { REPEAT_OPTIONS, EARLY_ALERT_OPTIONS, HABIT_SCHEDULE_OPTIONS, HABIT_PREFERRED_TIME_OPTIONS } from '@/domain/quickAdd';
import { formatDuration } from '@/features/today/mapDayItemToRow';
import { useItemDetailForm } from './useItemDetailForm';

export function ItemDetailSheet() {
  const { palette, font } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const form = useItemDetailForm();
  const { gesture: dragGesture, animatedStyle: dragStyle } = useSheetDragDismiss(!!form.itemId, form.close);

  if (!form.item) return <Modal visible={!!form.itemId} transparent animationType="fade" />;
  const item = form.item;

  const typeLabel = t(form.meta.tabLabelKey);

  return (
    <Modal visible={!!form.itemId} animationType="slide" transparent onRequestClose={form.close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={form.close} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrap} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: insets.bottom + 16 }, dragStyle]}
          >
          <GestureDetector gesture={dragGesture}>
            <View style={styles.handleGrabArea}>
              <View style={[styles.handle, { backgroundColor: palette.surfaceHigh }]} />
            </View>
          </GestureDetector>

          <View style={styles.header}>
            <Text style={{ fontFamily: font.extrabold, fontSize: 24, color: palette.text }}>{typeLabel}</Text>
            <Pressable
              onPress={form.close}
              style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}
              accessibilityRole="button"
              accessibilityLabel={t('a11yCloseSheet')}
            >
              <Icon name="close" size={20} color={palette.textDim} />
            </Pressable>
          </View>

          {form.readOnly ? (
            <View style={[styles.readOnlyBanner, { backgroundColor: `${palette.textDim}1A` }]}>
              <Icon name="users" size={16} color={palette.textDim} />
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: palette.textDim, flex: 1 }}>
                {t('itemDetailReadOnlyBanner')}
              </Text>
            </View>
          ) : null}

          <View pointerEvents={form.readOnly ? 'none' : 'auto'} style={form.readOnly ? styles.readOnlyForm : undefined}>
          {item.type !== 'moment' ? <TypeTabs value={form.type} onChange={form.handleTypeChange} /> : null}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.titleRow}>
              <View style={[styles.inputBox, { flex: 1, backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                <TextInput
                  value={form.title}
                  onChangeText={form.setTitle}
                  placeholder={form.dictation.listening ? t('listeningPlaceholder') : t(form.meta.placeholderKey)}
                  placeholderTextColor={palette.textDim}
                  autoCorrect={false}
                  spellCheck={false}
                  multiline
                  style={{ fontFamily: font.medium, fontSize: 16, color: palette.text, padding: 0, paddingRight: 36 }}
                />
                <Pressable
                  onPress={form.dictation.toggle}
                  style={[styles.micButton, { backgroundColor: form.dictation.listening ? palette.accent : palette.surfaceHigh }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11yDictateTitle')}
                >
                  <Icon name="mic" size={15} color={form.dictation.listening ? '#fff' : palette.textDim} />
                </Pressable>
              </View>
            </View>

            {form.type === 'note' && (
              <View style={[styles.noteBodyBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                <TextInput
                  value={form.richTextBody}
                  onChangeText={form.setRichTextBody}
                  placeholder={t('notePlaceholderBody')}
                  placeholderTextColor={palette.textDim}
                  multiline
                  textAlignVertical="top"
                  style={{ fontFamily: font.regular, fontSize: 15, color: palette.text, minHeight: 120 }}
                />
              </View>
            )}

            {form.type === 'voiceMemo' && (
              <FieldSection>
                {item.type === 'voiceMemo' ? (
                  <FieldRow icon="graphic-eq" label={t('fieldRecorded')} value={item.audioFileUri ? formatDuration(item.durationSeconds) : t('audioDeleted')} onPress={() => {}} showBorder={false} />
                ) : (
                  <VoiceRecordRow
                    recorder={form.recorder}
                    recordedUri={form.recordedUri}
                    recordedSeconds={form.recordedSeconds}
                    onRecorded={form.handleVoiceRecorded}
                    onDelete={form.handleVoiceDelete}
                    onPermissionDenied={form.handleVoicePermissionDenied}
                    onError={form.handleVoiceError}
                    showBorder={false}
                  />
                )}
              </FieldSection>
            )}

            <FieldSection>
              <DateFieldRow
                icon="calendar-month"
                label={t('fieldDate')}
                dateKey={form.dateKey}
                onChange={form.setDateKey}
                allowInbox
                showBorder
              />

              {form.type === 'task' && (
                <>
                  <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={form.taskReminderMinutes} onChange={form.setTaskReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime />
                  <PresetFieldRow icon="repeat" label={t('fieldRepeat')} options={REPEAT_OPTIONS} value={form.taskRepeat} onChange={form.setTaskRepeat} lang={lang} showBorder={false} />
                </>
              )}

              {form.type === 'event' && (
                <>
                  <TimeFieldRow icon="schedule" label={t('fieldStarts')} minutes={form.eventStartMinutes} onChange={(m) => form.setEventStartMinutes(m ?? form.eventStartMinutes)} offLabel="" />
                  <DurationFieldRow icon="schedule" label={t('fieldDuration')} minutes={form.eventDurationMinutes} onChange={form.setEventDurationMinutes} />
                  <PresetFieldRow icon="notifications" label={t('fieldEarlyAlert')} options={EARLY_ALERT_OPTIONS} value={form.eventEarlyAlert} onChange={form.setEventEarlyAlert} lang={lang} showBorder={false} />
                </>
              )}

              {form.type === 'voiceMemo' && (
                <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={form.voiceReminderMinutes} onChange={form.setVoiceReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime showBorder={false} />
              )}

              {form.type === 'note' && (
                <TimeFieldRow icon="notifications" label={t('fieldRemindMe')} minutes={form.noteReminderMinutes} onChange={form.setNoteReminderMinutes} offLabel={t('offLabel')} clearable allowAnyTime showBorder={false} />
              )}

              {form.type === 'habit' && (
                <>
                  <PresetFieldRow icon="repeat" label={t('fieldSchedule')} options={HABIT_SCHEDULE_OPTIONS} value={form.habitSchedule} onChange={form.setHabitSchedule} lang={lang} />
                  <PresetFieldRow icon="schedule" label={t('fieldPreferredTime')} options={HABIT_PREFERRED_TIME_OPTIONS} value={form.habitPreferredTime} onChange={form.setHabitPreferredTime} lang={lang} />
                  <HealthAutoTrackFieldRow
                    icon="favorite"
                    label={t('fieldAutoTrack')}
                    metricId={form.habitHealthMetric}
                    target={form.habitHealthMetricTarget}
                    onChange={(nextId, nextTarget) => {
                      form.setHabitHealthMetric(nextId);
                      form.setHabitHealthMetricTarget(nextTarget);
                    }}
                    showBorder={false}
                  />
                </>
              )}
            </FieldSection>

            {(form.type === 'task' || form.type === 'event') && (
              <FieldSection>
              <LinkFieldRow value={form.link} onChange={form.setLink} showBorder={false} />
              </FieldSection>
            )}

            <FieldSection>
              <CategoryChips value={form.category?.label ?? null} onChange={(label, color) => form.setCategory({ label, color })} showBorder />
              <PriorityTabs value={form.priority} onChange={form.setPriority} />
            </FieldSection>
          </ScrollView>
          </View>

          <SheetActions
            onCancel={form.close}
            onConfirm={() => form.handleSave()}
            confirmLabel={form.type === 'task' || form.type === 'habit' ? t('itemDetailUpdateAction') : t(form.meta.ctaUpdateKey)}
            confirmDisabled={form.saveDisabled}
            secondaryLabel={form.type === 'habit' ? (form.isDoneToday ? t('itemDetailMarkUndone') : t('itemDetailMarkHabitDone')) : form.isDoneToday ? t('itemDetailMarkUndone') : t('itemDetailMarkDone')}
            secondaryIcon="check"
            onSecondary={!form.readOnly && (form.type === 'task' || form.type === 'habit') ? form.handleMarkToggle : undefined}
            secondaryActive={form.isDoneToday}
          />
        </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, maxHeight: '90%' },
  handleGrabArea: { paddingTop: 12, paddingBottom: 16, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  inputBox: {
    borderRadius: 16,
    padding: 18,
    paddingBottom: 40,
    minHeight: 76,
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
  noteBodyBox: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  readOnlyForm: { opacity: 0.55 },
});
