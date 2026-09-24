import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppState, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useQuickAddStore } from '@/store/quickAddStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { AnimatedSplash } from '@/components/AnimatedSplash';
import { initDb } from '@/data/local/db';
import { refreshAppBadge } from '@/services/appBadge';
import { useCategoriesStore } from '@/store/categoriesStore';
import { QuickAddSheet } from '@/components/quickAdd/QuickAddSheet';
import { AddMenu } from '@/components/AddMenu';
import { VoiceAddScreen } from '@/components/voiceAdd/VoiceAddScreen';
import { ItemDetailSheet } from '@/components/itemDetail/ItemDetailSheet';
import { TimeDragOverlay } from '@/components/TimeDragOverlay';
import { RemindersSheet } from '@/components/reminders/RemindersSheet';
import { CategoriesManagerSheet } from '@/components/settings/CategoriesManagerSheet';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useSettingsStore } from '@/store/settingsStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { palette, scheme } = useTheme();

  // El permiso de notificaciones ya NO se pide al arrancar: se pide con
  // contexto al final del onboarding (`NotificationsStep`). Ver CLAUDE.md.

  // Deep link del widget "Agregar rápido" de Android/iOS (ver
  // `src/widget/QuickAddAndroidWidget.tsx` / `TodayWidget.swift` →
  // `QuickAddWidget`): tocarlo arma una URI con `Linking.createURL('/', {
  // queryParams: { openQuickAdd: 'task' } })` — se resuelve al scheme real
  // del variant (no hardcodeado). Acá se escucha esa URI tanto en frío (app
  // cerrada, `getInitialURL`) como en caliente (app ya abierta, evento
  // `url`) y se abre Quick Add directo, sin pasar por ninguna pantalla.
  const handleDeepLink = useCallback((url: string | null) => {
    if (!url) return;
    const { queryParams } = Linking.parse(url);
    if (queryParams?.openQuickAdd) {
      useQuickAddStore.getState().open('task');
    }
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then(handleDeepLink);
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, [handleDeepLink]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
      <QuickAddSheet />
      <AddMenu />
      <VoiceAddScreen />
      <ItemDetailSheet />
      <TimeDragOverlay />
      <RemindersSheet />
      <CategoriesManagerSheet />
    </>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    initDb();
    useCategoriesStore.getState().load();
    setDbReady(true);
    // Contador de tareas pendientes en el ícono: al abrir y cada vez que la
    // app vuelve a primer plano (p. ej. al pasar la medianoche cambia "hoy").
    refreshAppBadge();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAppBadge();
    });
    return () => sub.remove();
  }, []);

  const ready = dbReady && fontsLoaded;

  // El splash nativo estático (mismo logo/fondo, ver app.config.ts) se oculta
  // apenas React pinta el primer frame con `AnimatedSplash` — directo en un
  // efecto, SIN esperar un evento `onLayout` de por medio (patrón de
  // `my-wallet-app`). Depender de `onLayout` de `SafeAreaProvider` llegó a
  // tardar 27s en dispositivo real en una sesión de pruebas larga — con
  // `hideAsync()` disparado apenas el componente monta, no hay esa
  // indirección.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#121212' }} />;
  }

  // Un solo árbol de CONTENIDO a la vez (splash O app, nunca los dos
  // superpuestos) — se probó como overlay encima de RootStack y no cubría
  // toda la pantalla de forma confiable (bug real: el glow quedaba flotando
  // sobre Today). Pero `GestureHandlerRootView`/`SafeAreaProvider` se montan
  // SIEMPRE, una sola vez — `AnimatedSplash` usa `react-native-svg`
  // (`Circle`/`RadialGradient` del glow) igual que `AuraBackground` en
  // Today, y ese árbol necesita el mounting manager de Fabric ya
  // inicializado por esos providers para poder pintar (sin ellos, el SVG
  // queda mudo: los props nunca llegan a la vista nativa aunque Reanimated
  // siga corriendo del lado JS — bug real visto en dispositivo, el splash
  // "terminaba" a tiempo pero nunca se veían ni el glow ni el texto).
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {!introDone ? (
          <AnimatedSplash onFinish={() => setIntroDone(true)} />
        ) : !onboardingCompleted ? (
          <OnboardingScreen onDone={() => setOnboardingCompleted(true)} />
        ) : (
          <ThemeProvider>
            <RootStack />
          </ThemeProvider>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
