import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFitmediaFonts } from '../src/theme/fonts';
import { colors } from '../src/theme';
import { useAuthStore } from '../stores/authStore';
import { SnackBarProvider } from '../src/components/primitives';

/**
 * Root layout for the entire app.
 *
 * CRITICAL: We gate the entire app render on Inter being loaded.
 * If we render before fonts are ready, text will use system fallbacks
 * (San Francisco / Roboto) and look completely off — incorrect metrics,
 * wrong weight rendering, wrong letter-spacing.
 */
export default function RootLayout() {
  const fontsLoaded = useFitmediaFonts();
  const session = useAuthStore((state) => state.session);
  const onboardingComplete = useAuthStore((state) => state.onboardingComplete);
  const initialized = useAuthStore((state) => state.initialized);
  const init = useAuthStore((state) => state.init);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    init().catch((error) => {
      console.warn('Auth initialization failed.', error);
    });
  }, [init]);

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const atIndex = !segments[0] || segments[0] === 'index';

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/auth/login');
      }
      return;
    }

    if (onboardingComplete === false) {
      if (!inOnboarding && !atIndex) {
        router.replace('/onboarding/basic-info');
      }
      return;
    }

    if (onboardingComplete === true && (inAuthGroup || inOnboarding || atIndex)) {
      router.replace('/(tabs)/home');
    }
  }, [initialized, onboardingComplete, router, segments, session]);

  if (!fontsLoaded || !initialized) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <SnackBarProvider>
            <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
              }}
            />
          </SnackBarProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
