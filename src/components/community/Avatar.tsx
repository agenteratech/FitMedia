import React from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors, typography } from '@/theme';

const PALETTE = [colors.accent, colors.success, colors.ink2, '#C77D4A', '#5B7A8C', '#8A6FA8'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
  ring?: boolean;
}

/**
 * Avatar — renders the user's photo when available, otherwise a deterministic
 * colored circle with initials. OTA-safe (no native image picker needed).
 */
export function Avatar({ name, uri, size = 44, ring = false }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = ring ? { borderWidth: 2, borderColor: colors.accent } : null;

  if (uri) {
    return <Image source={{ uri }} style={[styles.base, dimension, ringStyle as ViewStyle]} />;
  }

  return (
    <View style={[styles.base, dimension, { backgroundColor: colorFor(name) }, ringStyle as ViewStyle]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunk,
  } satisfies ViewStyle,
  initials: {
    fontFamily: typography.subheading.fontFamily,
    color: colors.surface,
    includeFontPadding: false,
  } as TextStyle,
});
