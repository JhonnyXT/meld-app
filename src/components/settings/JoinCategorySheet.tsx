import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { useTranslation, type TranslationKey } from '@/i18n';
import { useSheetDragDismiss } from '@/hooks/useSheetDragDismiss';
import { JoinCodeError, joinCategoryWithCode, type JoinCodeErrorKind } from '@/sync';

interface JoinCategorySheetProps {
  visible: boolean;
  onClose: () => void;
}

const ERROR_KEY: Record<JoinCodeErrorKind, TranslationKey> = {
  'no-session': 'joinCategoryErrorNoSession',
  'invalid-code': 'joinCategoryErrorInvalidCode',
  'expired-code': 'joinCategoryErrorExpiredCode',
  'free-limit': 'joinCategoryErrorFreeLimit',
  denied: 'joinCategoryErrorDenied',
};

/** Hoja de "Unirme con un código" (SYNC_ROADMAP.md, Fase 4) — mismo patrón visual que
 * `CategoryFormModal`/`ShareCategorySheet`. Sin gate de plan (T9: un invitado Free participa
 * igual, solo quien comparte necesita Pro) ni de sesión en el render (a diferencia de
 * `ShareCategorySheet`, que sí lo gatea antes de mostrar el formulario): acá se intenta directo y
 * `joinCategoryWithCode` devuelve `JoinCodeError('no-session')` si hace falta, con su propio
 * mensaje — simplifica el componente sin perder el aviso. Al unirme, `src/sync/engine.ts` ya pide
 * una traída (`requestSync({ pull: true })`), así que la categoría nueva aparece sola en la lista
 * en cuanto `pullSpaces` la descubre — este sheet solo informa que se unió, no espera a verla. */
export function JoinCategorySheet({ visible, onClose }: JoinCategorySheetProps) {
  const { palette, font } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCode('');
    setBusy(false);
    setErrorKey(null);
    setSuccess(false);
  }, [visible]);

  const { gesture: dragGesture, animatedStyle: dragStyle } = useSheetDragDismiss(visible, onClose);

  const handleJoin = async () => {
    setBusy(true);
    setErrorKey(null);
    try {
      await joinCategoryWithCode(code);
      setSuccess(true);
    } catch (e) {
      setErrorKey(ERROR_KEY[e instanceof JoinCodeError ? e.kind : 'denied']);
    } finally {
      setBusy(false);
    }
  };

  const joinDisabled = busy || code.trim().length < 4;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap} pointerEvents="box-none">
          <Animated.View
            style={[styles.sheet, { backgroundColor: palette.surface, paddingBottom: insets.bottom + 16 }, dragStyle]}
          >
            <GestureDetector gesture={dragGesture}>
              <View style={styles.handleGrabArea}>
                <View style={[styles.handle, { backgroundColor: palette.surfaceHigh }]} />
              </View>
            </GestureDetector>

            <View style={styles.header}>
              <Text style={{ fontFamily: font.extrabold, fontSize: 22, color: palette.text }}>
                {t('joinCategoryTitle')}
              </Text>
              <Pressable
                onPress={onClose}
                style={[styles.closeButton, { backgroundColor: palette.surfaceLow }]}
                accessibilityRole="button"
                accessibilityLabel={t('a11yCloseSheet')}
              >
                <Icon name="close" size={20} color={palette.textDim} />
              </Pressable>
            </View>

            {success ? (
              <View style={styles.successBox}>
                <View style={[styles.successIcon, { backgroundColor: `${palette.accent}26` }]}>
                  <Icon name="check" size={26} color={palette.accent} />
                </View>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: palette.text, textAlign: 'center', marginTop: 12 }}>
                  {t('joinCategorySuccess')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ fontFamily: font.regular, fontSize: 14, color: palette.textDim, lineHeight: 20, marginBottom: 20 }}>
                  {t('joinCategoryIntro')}
                </Text>

                <View style={[styles.inputBox, { backgroundColor: palette.surfaceLow, borderColor: palette.border }]}>
                  <TextInput
                    value={code}
                    onChangeText={(v) => setCode(v.toUpperCase())}
                    placeholder={t('joinCategoryPlaceholder')}
                    placeholderTextColor={palette.textDim}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={6}
                    style={{ fontFamily: font.extrabold, fontSize: 24, letterSpacing: 6, color: palette.text, padding: 0, textAlign: 'center' }}
                  />
                </View>

                {errorKey ? (
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: palette.danger, marginTop: 6, lineHeight: 18 }}>
                    {t(errorKey)}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleJoin}
                  disabled={joinDisabled}
                  style={[styles.cta, { backgroundColor: palette.accent, opacity: joinDisabled ? 0.5 : 1 }]}
                >
                  <Icon name="users" size={20} color="#fff" />
                  <Text style={{ fontFamily: font.bold, fontSize: 17, color: '#fff' }}>{t('joinCategoryButton')}</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20 },
  handleGrabArea: { paddingTop: 12, paddingBottom: 16, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  closeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  inputBox: { borderRadius: 16, paddingVertical: 20, borderWidth: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  successBox: { alignItems: 'center', paddingVertical: 20, marginBottom: 20 },
  successIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
