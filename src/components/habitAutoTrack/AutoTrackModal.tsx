import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation } from '@/i18n';
import { HEALTH_METRIC_OPTIONS, findHealthMetricOption, type HealthMetricGroup } from '@/domain/healthMetrics';

interface AutoTrackModalProps {
  visible: boolean;
  metricId: string | null;
  target: number | null;
  onCancel: () => void;
  onConfirm: (metricId: string | null, target: number | null) => void;
}

const GROUP_ORDER: HealthMetricGroup[] = ['activity', 'rings', 'workouts'];
const GROUP_LABEL_KEY: Record<HealthMetricGroup, 'autoTrackSectionActivity' | 'autoTrackSectionRings' | 'autoTrackSectionWorkouts'> = {
  activity: 'autoTrackSectionActivity',
  rings: 'autoTrackSectionRings',
  workouts: 'autoTrackSectionWorkouts',
};

/** Modal de selección de Auto-registro (fiel al picker de referencia del
 * usuario: None + secciones Activity/Rings/Workouts, con stepper +/- inline
 * en la métrica de Actividad seleccionada). Elegir cualquier opción distinta
 * de "None" es lo que convierte un hábito en "de salud" (ícono según la
 * métrica + corazón, ver `mapDayItemToRow.ts`) — ver `autoTrackProNote` para
 * la nota de que el marcado automático real es de plan Pro. */
export function AutoTrackModal({ visible, metricId, target, onCancel, onConfirm }: AutoTrackModalProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [selectedId, setSelectedId] = useState<string | null>(metricId);
  const [targetValue, setTargetValue] = useState<number | null>(target);

  useEffect(() => {
    if (visible) {
      setSelectedId(metricId);
      setTargetValue(target);
    }
  }, [visible, metricId, target]);

  const selectOption = (id: string | null) => {
    if (id === selectedId) return;
    setSelectedId(id);
    const option = findHealthMetricOption(id);
    setTargetValue(option?.defaultTarget ?? null);
  };

  const adjustTarget = (delta: number) => {
    const option = findHealthMetricOption(selectedId);
    if (!option) return;
    const next = Math.max(option.step ?? 1, (targetValue ?? option.defaultTarget ?? 0) + delta);
    setTargetValue(next);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.handle, { backgroundColor: palette.surfaceHigh }]} />

        <View style={styles.header}>
          <Text style={{ fontFamily: font.extrabold, fontSize: 22, color: palette.text }}>{t('autoTrackModalTitle')}</Text>
          <Pressable
            onPress={onCancel}
            style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}
            accessibilityRole="button"
            accessibilityLabel={t('a11yCloseSheet')}
          >
            <Icon name="close" size={20} color={palette.textDim} />
          </Pressable>
        </View>

        <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.textDim, marginBottom: 16 }}>
          {t('autoTrackProNote')}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => selectOption(null)}
            style={[styles.row, { borderBottomColor: palette.border, borderBottomWidth: 1 }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: palette.surfaceHigh }]}>
              <Icon name="check" size={16} color={palette.textDim} />
            </View>
            <View style={styles.rowLabel}>
              <Text style={{ fontFamily: font.medium, fontSize: 15, color: palette.text }}>{t('autoTrackNoneLabel')}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: palette.textDim }}>{t('autoTrackNoneSubtitle')}</Text>
            </View>
            {selectedId === null ? <Icon name="check" size={18} color={palette.accent} /> : null}
          </Pressable>

          {GROUP_ORDER.map((group) => (
            <View key={group}>
              <Text
                style={{
                  fontFamily: font.semibold,
                  fontSize: 12,
                  color: palette.textDim,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginTop: 18,
                  marginBottom: 4,
                }}
              >
                {t(GROUP_LABEL_KEY[group])}
              </Text>
              {HEALTH_METRIC_OPTIONS.filter((o) => o.group === group).map((option) => {
                const selected = selectedId === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => selectOption(option.id)}
                    style={[styles.row, { borderBottomColor: palette.border, borderBottomWidth: 1 }]}
                  >
                    <View style={[styles.iconCircle, { backgroundColor: palette.surfaceHigh }]}>
                      <Icon name={option.icon} size={16} color={palette.textDim} />
                    </View>
                    <Text style={[styles.rowLabel, { fontFamily: font.medium, fontSize: 15, color: palette.text }]}>
                      {t(option.labelKey)}
                    </Text>
                    {selected && option.defaultTarget != null ? (
                      <View style={styles.stepper}>
                        <Pressable onPress={() => adjustTarget(-(option.step ?? 1))} hitSlop={8} style={[styles.stepBtn, { backgroundColor: palette.surfaceLow }]}>
                          <Text style={{ fontFamily: font.bold, fontSize: 16, color: palette.text }}>–</Text>
                        </Pressable>
                        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: palette.text, minWidth: 56, textAlign: 'center' }}>
                          {targetValue ?? option.defaultTarget} {t(option.unitKey!)}
                        </Text>
                        <Pressable onPress={() => adjustTarget(option.step ?? 1)} hitSlop={8} style={[styles.stepBtn, { backgroundColor: palette.surfaceLow }]}>
                          <Text style={{ fontFamily: font.bold, fontSize: 16, color: palette.text }}>+</Text>
                        </Pressable>
                      </View>
                    ) : selected ? (
                      <Icon name="check" size={18} color={palette.accent} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <Pressable
          onPress={() => onConfirm(selectedId, selectedId ? targetValue : null)}
          style={[styles.cta, { backgroundColor: palette.accent }]}
        >
          <Icon name="check" size={20} color="#fff" />
          <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#fff' }}>{t('confirm')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowLabel: { flex: 1 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 16,
  },
});
