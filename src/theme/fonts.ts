import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

/**
 * Load Inter font weights used across Fitmedia.
 *
 * Usage in app/_layout.tsx:
 *
 *   const fontsLoaded = useFitmediaFonts();
 *   if (!fontsLoaded) return null; // or a splash screen
 *
 * IMPORTANT: do NOT render any UI until fontsLoaded is true,
 * otherwise typography will render with system fallbacks and look "off".
 */
export function useFitmediaFonts(): boolean {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  return loaded;
}
