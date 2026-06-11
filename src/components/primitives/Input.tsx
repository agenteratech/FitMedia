import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface InputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  value: string;
  error?: string;
  /** Optional outer container style override */
  style?: ViewStyle;
}

/**
 * Input primitive.
 * 56px tall, 16px radius. Label floats to the top on focus or when value is set.
 * Border upgrades from 1px surfaceElevBorder to 2px ink1 on focus.
 */
export function Input({ label, value = '', onChangeText, error, style, secureTextEntry, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  // Password fields start hidden; the eye toggle flips this.
  const isPassword = !!secureTextEntry;
  const [hidden, setHidden] = useState(isPassword);
  const anim = useSharedValue((value?.length ?? 0) > 0 ? 1 : 0);

  // When form data loads asynchronously, the initial value was '' so anim
  // started at 0. Snap the label up immediately when a value arrives.
  useEffect(() => {
    if ((value?.length ?? 0) > 0 && anim.value === 0) {
      anim.value = 1;
    }
  }, [value]);

  const handleFocus = useCallback(() => {
    setFocused(true);
    anim.value = withTiming(1, { duration: 150 });
  }, [anim]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (!value || value.length === 0) {
      anim.value = withTiming(0, { duration: 150 });
    }
  }, [anim, value]);

  const animatedLabelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(anim.value, [0, 1], [0, -11]) }],
    fontSize: interpolate(anim.value, [0, 1], [15, 11]),
    color: interpolateColor(anim.value, [0, 1], [colors.ink3, colors.ink2]),
  }));

  return (
    <View style={style}>
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          !!error && styles.containerError,
        ]}
      >
        <Animated.Text style={[styles.labelBase, animatedLabelStyle]}>
          {label}
        </Animated.Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={colors.ink4}
            secureTextEntry={isPassword && hidden}
            {...rest}
          />
          {isPassword ? (
            <Pressable
              onPress={() => setHidden((h) => !h)}
              hitSlop={10}
              style={styles.eyeBtn}
              accessibilityRole="button"
              accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            >
              {hidden ? (
                <EyeOff size={18} color={colors.ink3} strokeWidth={1.75} />
              ) : (
                <Eye size={18} color={colors.ink2} strokeWidth={1.75} />
              )}
            </Pressable>
          ) : null}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
  } satisfies ViewStyle,
  containerFocused: {
    borderWidth: 2,
    borderColor: colors.ink1,
  } satisfies ViewStyle,
  containerError: {
    borderColor: colors.alert,
    borderWidth: 1,
  } satisfies ViewStyle,
  labelBase: {
    position: 'absolute',
    left: spacing.lg,
    top: 19,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  } satisfies TextStyle,
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  } satisfies ViewStyle,
  input: {
    ...(typography.body as TextStyle),
    flex: 1,
    padding: 0,
    margin: 0,
    height: 22,
    color: colors.ink1,
  } satisfies TextStyle,
  eyeBtn: {
    paddingLeft: spacing.sm,
    height: 22,
    justifyContent: 'center',
  } satisfies ViewStyle,
  error: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  } satisfies TextStyle,
});
