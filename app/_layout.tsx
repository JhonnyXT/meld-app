import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
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
import { QuickAddSheet } from '@/components/quickAdd/QuickAddSheet';
import { NavigateMenu } from '@/components/NavigateMenu';
import { ItemDetailSheet } from '@/components/itemDetail/ItemDetailSheet';
import { TimeDragOverlay } from '@/components/TimeDragOverlay';
import { RemindersSheet } from '@/components/reminders/RemindersSheet';
import { primeNotificationPermissionOnLaunch } from '@/services/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { palette, scheme } = useTheme();

  useEffect(() => {
    primeNotificationPermissionOnLaunch();
  }, []);

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
      <NavigateMenu />
      <ItemDetailSheet />
      <TimeDragOverlay />
      <RemindersSheet />
    </>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
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
    setDbReady(true);
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
        {introDone ? (
          <ThemeProvider>
            <RootStack />
          </ThemeProvider>
        ) : (
          <AnimatedSplash onFinish={() => setIntroDone(true)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
