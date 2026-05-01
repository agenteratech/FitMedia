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

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'default' | 'compact';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Lucide icon component, e.g. `Plus`, `Dumbbell`. Renders left of label. */
  icon?: LucideIcon;
  /** Stretches the button to fill its container's width. */
  fullWidth?: boolean;
  /** Disables interaction and applies a muted appearance. */
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Button primitive.
 *
 * Variants:
 *   - 'primary'   — warm near-black bg, white text. The dominant CTA.
 *   - 'secondary' — transparent bg, 1px ink-1 border, ink-1 text.
 *   - 'ghost'     — no bg, no border, ink-1 text. For "Cancel", "Skip", inline.
 *
 * Sizes:
 *   - 'default' — 56px tall, 18px radius. Use for primary screen actions.
 *   - 'compact' — 40px tall, 14px radius. Use inside headers and cards.
 *
 * Examples:
 *   <Button label="Start Workout" icon={Dumbbell} fullWidth onPress={start} />
 *   <Button label="Save" size="compact" onPress={save} />
 *   <Button label="Cancel" variant="ghost" onPress={cancel} />
 */
export function Button({
  label,
  variant = 'primary',
  size = 'default',
  icon: Icon,
  fullWidth = false,
  disabled = false,
  style,
  ...rest
}: ButtonProps) {
  const sizeStyles = size === 'compact' ? compactSize : defaultSize;
  const variantStyles = useMemo(() => getVariantStyles(variant, disabled), [variant, disabled]);
  const iconSize = size === 'compact' ? 16 : 20;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={iconSize} color={variantStyles.text.color as string} strokeWidth={1.75} />
        </View>
      ) : null}
      <Text style={[typography.bodyMedium, variantStyles.text, sizeStyles.text]}>{label}</Text>
    </Pressable>
  );
}

const defaultSize = StyleSheet.create({
  container: {
    height: 56,
    borderRadius: radius.button,
    paddingHorizontal: spacing['2xl'],
  } satisfies ViewStyle,
  text: {
    fontSize: 15,
  } satisfies TextStyle,
});

const compactSize = StyleSheet.create({
  container: {
    height: 40,
    borderRadius: radius.buttonCompact,
    paddingHorizontal: spacing.lg,
  } satisfies ViewStyle,
  text: {
    fontSize: 14,
  } satisfies TextStyle,
});

function getVariantStyles(variant: ButtonVariant, disabled: boolean) {
  if (variant === 'primary') {
    return {
      container: {
        backgroundColor: disabled ? colors.ink4 : colors.ink1,
      } satisfies ViewStyle,
      text: {
        color: colors.surface,
      } satisfies TextStyle,
    };
  }
  if (variant === 'secondary') {
    return {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? colors.ink4 : colors.ink1,
      } satisfies ViewStyle,
      text: {
        color: disabled ? colors.ink3 : colors.ink1,
      } satisfies TextStyle,
    };
  }
  // ghost
  return {
    container: {
      backgroundColor: 'transparent',
    } satisfies ViewStyle,
    text: {
      color: disabled ? colors.ink3 : colors.ink1,
    } satisfies TextStyle,
  };
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  fullWidth: {
    alignSelf: 'stretch',
  } satisfies ViewStyle,
  pressed: {
    opacity: 0.9,
  } satisfies ViewStyle,
  iconWrap: {
    marginRight: spacing.sm,
  } satisfies ViewStyle,
});
