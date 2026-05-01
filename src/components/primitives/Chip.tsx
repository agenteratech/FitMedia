import { useMemo } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../theme';

export interface ChipProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  /** Whether this chip is in the selected state. */
  selected?: boolean;
  /** Optional Lucide icon, rendered before the label. */
  icon?: LucideIcon;
  style?: ViewStyle;
}

/**
 * Chip primitive.
 * 36px tall pill, fully rounded.
 *
 * Two states:
 *   - default  — surfaceSunk bg, ink2 text
 *   - selected — ink1 bg, white text
 *
 * Use for: filter chips ("All", "Push", "Pull"), tab chips ("Recent", "Frequent"),
 * metadata pills ("5 exercises", "≈ 45 min"), macro pills ("P 98g").
 *
 * Examples:
 *   <Chip label="All" selected />
 *   <Chip label="Push" onPress={() => setFilter('push')} />
 *   <Chip label="5 exercises" icon={Dumbbell} />
 */
export function Chip({
  label,
  selected = false,
  icon: Icon,
  style,
  ...rest
}: ChipProps) {
  const stateStyles = useMemo(() => getStateStyles(selected), [selected]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.base,
        stateStyles.container,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={14} color={stateStyles.text.color as string} strokeWidth={1.75} />
        </View>
      ) : null}
      <Text style={[typography.caption, stateStyles.text]}>{label}</Text>
    </Pressable>
  );
}

function getStateStyles(selected: boolean) {
  if (selected) {
    return {
      container: {
        backgroundColor: colors.ink1,
      } satisfies ViewStyle,
      text: {
        color: colors.surface,
      } satisfies TextStyle,
    };
  }
  return {
    container: {
      backgroundColor: colors.surfaceSunk,
    } satisfies ViewStyle,
    text: {
      color: colors.ink2,
    } satisfies TextStyle,
  };
}

const styles = StyleSheet.create({
  base: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start', // chips don't stretch
  } satisfies ViewStyle,
  pressed: {
    opacity: 0.85,
  } satisfies ViewStyle,
  iconWrap: {
    marginRight: spacing.xs + 2, // 6px
  } satisfies ViewStyle,
});
