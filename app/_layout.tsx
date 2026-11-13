import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppState, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useQuickAddStore } from '@/store/quickAddStore';
import { useDayItemsStore } from '@/store/dayItemsStore';
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
import { registerNotificationResponseHandling } from '@/services/notifications';
import { useCategoriesStore } from '@/store/categoriesStore';
import { QuickAddSheet } from '@/components/quickAdd/QuickAddSheet';
import { AddMenu } from '@/components/AddMenu';
import { VoiceAddScreen } from '@/components/voiceAdd/VoiceAddScreen';
import { ItemDetailSheet } from '@/components/itemDetail/ItemDetailSheet';
import { TimeDragOverlay } from '@/components/TimeDragOverlay';
import { RemindersSheet } from '@/components/reminders/RemindersSheet';
import { TrialEndedDialog } from '@/components/TrialEndedDialog';
import { NavDrawerLayout } from '@/components/navDrawer/NavDrawer';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { useSettingsStore } from '@/store/settingsStore';
import { startSync } from '@/sync';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { palette, scheme } = useTheme();

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

  useEffect(() => registerNotificationResponseHandling(() => useDayItemsStore.getState().reload()), []);

  useEffect(startSync, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') useDayItemsStore.getState().reload();
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <NavDrawerLayout>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </NavDrawerLayout>
      <QuickAddSheet />
      <AddMenu />
      <VoiceAddScreen />
      <ItemDetailSheet />
      <TimeDragOverlay />
      <RemindersSheet />
      <TrialEndedDialog />
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
    refreshAppBadge();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAppBadge();
    });
    return () => sub.remove();
  }, []);

  const ready = dbReady && fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#121212' }} />;
  }

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
