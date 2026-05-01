import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, shadows, typography } from '@/theme';

interface SnackBarOptions {
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

interface SnackBarMessage extends SnackBarOptions {
  id: number;
  message: string;
}

interface SnackBarContextValue {
  show: (message: string, options?: SnackBarOptions) => void;
}

const SnackBarContext = createContext<SnackBarContextValue>({
  show: () => {},
});

export function useSnackBar() {
  return useContext(SnackBarContext);
}

/**
 * SnackBarProvider — wrap the app root with this (in app/_layout.tsx).
 * Renders snackbars above all content via absolute positioning.
 */
export function SnackBarProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<SnackBarMessage | null>(null);
  const idRef = useRef(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  const dismiss = useCallback(() => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(16, { duration: 200 });
    setTimeout(() => setCurrent(null), 220);
  }, [opacity, translateY]);

  const show = useCallback(
    (message: string, options?: SnackBarOptions) => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      idRef.current += 1;
      const id = idRef.current;
      setCurrent({ id, message, ...options });
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
      dismissTimer.current = setTimeout(dismiss, 3000);
    },
    [dismiss, opacity, translateY]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const insets = useSafeAreaInsets();

  return (
    <SnackBarContext.Provider value={{ show }}>
      {children}
      {current ? (
        <Animated.View
          style={[
            styles.container,
            { bottom: insets.bottom + 96 }, // sits above floating tab bar
            animatedStyle,
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.pill}>
            {current.icon ? (
              <current.icon
                size={16}
                color={colors.surface}
                strokeWidth={1.75}
                style={styles.icon}
              />
            ) : null}
            <Text style={styles.message} numberOfLines={2}>
              {current.message}
            </Text>
            {current.actionLabel ? (
              <Pressable
                onPress={() => {
                  current.onAction?.();
                  dismiss();
                }}
                style={styles.action}
              >
                <Text style={styles.actionLabel}>{current.actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </SnackBarContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
    pointerEvents: 'box-none',
  } satisfies ViewStyle,
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink1,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    maxWidth: 320,
    ...shadows.snackBar,
    gap: spacing.sm,
  } satisfies ViewStyle,
  icon: {
    flexShrink: 0,
  },
  message: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.surface,
    flex: 1,
    fontSize: 14,
  } satisfies TextStyle,
  action: {
    marginLeft: spacing.sm,
    flexShrink: 0,
  } satisfies ViewStyle,
  actionLabel: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.accentSoft,
    fontSize: 14,
  } satisfies TextStyle,
});
