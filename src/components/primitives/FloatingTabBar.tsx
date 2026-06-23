import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, shadows } from '@/theme';

/**
 * FloatingTabBar — custom tab bar for expo-router <Tabs />.
 * Floats 16px above safe area, 16px side gaps, 64px tall, 28px radius.
 *
 * Layout per tab (vertical stack, always the same height):
 *   ┌────────────────────────┐
 *   │  [48×32 icon pill]     │  ← accentSoft bg when active, transparent otherwise
 *   │     label text         │  ← accent color when active, opacity:0 otherwise
 *   └────────────────────────┘
 *
 * Rendering the label on ALL tabs (just invisible when inactive) keeps every icon
 * pinned at the same vertical position regardless of focus state.
 *
 * Pass icons as Lucide component classes in tabBarIcon:
 *   <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: House }} />
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, shadows.tabBar]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          // Routes hidden via `href: null` get tabBarItemStyle.display === 'none'
          // from expo-router but remain in state.routes — skip them in this
          // custom bar so they don't render a button.
          if ((options.tabBarItemStyle as { display?: string } | undefined)?.display === 'none') {
            return null;
          }
          const isFocused = state.index === index;

          const IconComponent = options.tabBarIcon as unknown as React.ComponentType<{
            size: number;
            color: string;
            strokeWidth: number;
          }>;
          const label = (options.title ?? route.name) as string;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              style={styles.tab}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              {/* Icon in a fixed 48×32 container. Background only when active. */}
              <View style={[styles.iconPill, isFocused && styles.iconPillActive]}>
                {IconComponent ? (
                  <IconComponent
                    size={20}
                    color={isFocused ? colors.accent : colors.ink2}
                    strokeWidth={1.75}
                  />
                ) : null}
              </View>

              {/* Label always rendered so icon never shifts. Invisible when inactive. */}
              <Text
                style={[styles.label, { opacity: isFocused ? 1 : 0 }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  } satisfies ViewStyle,
  bar: {
    height: 64,
    borderRadius: radius.sheet,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  } satisfies ViewStyle,
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    gap: 3,
  } satisfies ViewStyle,
  iconPill: {
    width: 48,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  iconPillActive: {
    backgroundColor: colors.accentSoft,
  } satisfies ViewStyle,
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 13,
    color: colors.accent,
    letterSpacing: 0,
  } satisfies TextStyle,
});
