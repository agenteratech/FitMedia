import type { ViewStyle } from 'react-native';
import { Platform } from 'react-native';

/**
 * Fitmedia shadow tokens.
 *
 * Cards do NOT get shadows. Only floating elements do:
 *   - tabBar       (the floating capsule at bottom)
 *   - snackBar     (the floating pill notification)
 *   - sheet        (bottom sheets, sheets float as "islands")
 *   - timer        (the dynamic timer island, slightly heavier)
 *   - modal        (centered confirmation modals)
 *
 * iOS uses shadow* props. Android uses elevation, which can't be customized
 * for color/offset, so the values below are tuned per-platform to match.
 */

const platformShadow = (
  iosShadow: Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius'>,
  androidElevation: number
): ViewStyle =>
  Platform.select({
    ios: iosShadow,
    android: { elevation: androidElevation },
    default: iosShadow,
  }) as ViewStyle;

export const shadows = {
  tabBar: platformShadow(
    {
      shadowColor: '#140F0A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
    6
  ),

  snackBar: platformShadow(
    {
      shadowColor: '#140F0A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    8
  ),

  sheet: platformShadow(
    {
      shadowColor: '#140F0A',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 32,
    },
    12
  ),

  timer: platformShadow(
    {
      shadowColor: '#140F0A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 28,
    },
    16
  ),

  modal: platformShadow(
    {
      shadowColor: '#140F0A',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 48,
    },
    20
  ),
} as const;

export type ShadowToken = keyof typeof shadows;
