import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Sparkles, Lightbulb, Zap, Settings, RotateCcw } from 'lucide-react-native';
import { Sheet } from '../primitives/Sheet';
import { pickTip, COMPANION_NAME } from '../../../lib/companion/messages';
import { colors, spacing, typography, radius } from '../../theme';
import type { Personality } from '../../../lib/companion/messages';

// ── Avatar ────────────────────────────────────────────────────────────────────

export function CompanionAvatarButton({
  onPress,
  size = 40,
}: {
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        avatarBtnStyles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && avatarBtnStyles.pressed,
      ]}
      accessibilityLabel="Open AI Companion"
      accessibilityRole="button"
    >
      <Sparkles size={size * 0.44} color={colors.accent} strokeWidth={1.75} />
    </Pressable>
  );
}

const avatarBtnStyles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  pressed: { opacity: 0.75 } satisfies ViewStyle,
});

// ── Sheet ─────────────────────────────────────────────────────────────────────

const PERSONALITY_LABELS: Record<Personality, string> = {
  friendly:     '😊 Friendly',
  motivational: '🔥 Motivational',
  strict:       '💪 Strict Coach',
  playful:      '🎉 Playful',
};

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  personality: Personality;
  onOpenSettings: () => void;
}

export function CompanionSheet({
  visible,
  onClose,
  personality,
  onOpenSettings,
}: SheetProps) {
  const tip = useMemo(() => pickTip(), [visible]); // new tip each open

  return (
    <Sheet visible={visible} onClose={onClose}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarSmall}>
          <Sparkles size={20} color={colors.accent} strokeWidth={1.75} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{COMPANION_NAME}</Text>
          <Text style={styles.mode}>{PERSONALITY_LABELS[personality]}</Text>
        </View>
        <Pressable
          onPress={() => { onClose(); setTimeout(onOpenSettings, 300); }}
          hitSlop={8}
        >
          <Settings size={18} color={colors.ink3} strokeWidth={1.75} />
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Today's tip */}
      <View style={styles.tipCard}>
        <View style={styles.tipIconWrap}>
          <Lightbulb size={16} color={colors.accent} strokeWidth={1.75} />
        </View>
        <Text style={styles.tipText}>{tip}</Text>
      </View>

      <View style={styles.divider} />

      {/* Action rows */}
      <ActionRow
        icon={<Zap size={18} color={colors.ink2} strokeWidth={1.75} />}
        label="Motivate me"
        caption="Get a personalized boost"
        onPress={() => {}}
      />
      <View style={styles.divider} />
      <ActionRow
        icon={<Lightbulb size={18} color={colors.ink2} strokeWidth={1.75} />}
        label="Fitness tip"
        caption="Learn something useful"
        onPress={() => {}}
      />
      <View style={styles.divider} />
      <ActionRow
        icon={<RotateCcw size={18} color={colors.ink2} strokeWidth={1.75} />}
        label="App guidance"
        caption="How to use any feature"
        onPress={() => {}}
      />

      <View style={styles.bottomPad} />
    </Sheet>
  );
}

// ── Action Row ────────────────────────────────────────────────────────────────

function ActionRow({
  icon, label, caption, onPress,
}: {
  icon: React.ReactNode;
  label: string;
  caption: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionCaption}>{caption}</Text>
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.lg,
  } satisfies ViewStyle,
  avatarSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  headerText: { flex: 1 } satisfies ViewStyle,
  name: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  mode: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 1,
  } satisfies TextStyle,

  divider: { height: 1, backgroundColor: colors.surfaceElevBorder } satisfies ViewStyle,

  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
    backgroundColor: colors.accentSoft,
  } satisfies ViewStyle,
  tipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } satisfies ViewStyle,
  tipText: {
    ...(typography.caption as TextStyle),
    color: colors.ink1,
    lineHeight: 19,
    flex: 1,
  } satisfies TextStyle,

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  } satisfies ViewStyle,
  actionRowPressed: { backgroundColor: colors.surfaceSunk } satisfies ViewStyle,
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  actionText: { flex: 1 } satisfies ViewStyle,
  actionLabel: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  actionCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 1,
  } satisfies TextStyle,

  bottomPad: { height: spacing.xl } satisfies ViewStyle,
});
