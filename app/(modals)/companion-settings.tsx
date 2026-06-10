import React from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Sparkles, RotateCcw } from 'lucide-react-native';
import { useCompanion } from '../../hooks/useCompanion';
import { Chip, Card, Button } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';
import type { Personality } from '../../lib/companion/messages';

const PERSONALITIES: { value: Personality; label: string; caption: string }[] = [
  { value: 'friendly',     label: '😊 Friendly',      caption: 'Warm, encouraging, supportive'     },
  { value: 'motivational', label: '🔥 Motivational',   caption: 'High energy, push through limits'  },
  { value: 'strict',       label: '💪 Strict Coach',   caption: 'Direct, no excuses, results-first' },
  { value: 'playful',      label: '🎉 Playful',        caption: 'Fun, witty, keeps it light'        },
];

const NOTIF_CATEGORIES: { key: 'workout' | 'diet' | 'sleep' | 'streak'; label: string; caption: string; time: string }[] = [
  { key: 'workout', label: 'Workout Reminder',  caption: 'Daily push to train',                  time: '9:00 AM'  },
  { key: 'diet',    label: 'Meal Reminder',     caption: 'Log your nutrition daily',              time: '1:00 PM'  },
  { key: 'sleep',   label: 'Sleep Reminder',    caption: 'Wind down and log sleep',              time: '9:30 PM'  },
  { key: 'streak',  label: 'Streak Check-in',   caption: 'Keep your consistency streak alive',   time: '8:00 PM'  },
];

export default function CompanionSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    enabled, setEnabled,
    personality, setPersonality,
    notificationsGranted,
    categories, setCategory,
    replayTutorial,
  } = useCompanion();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <View style={styles.headerTitle}>
          <View style={styles.headerAvatar}>
            <Sparkles size={14} color={colors.accent} strokeWidth={1.75} />
          </View>
          <Text style={styles.title}>AI Companion</Text>
        </View>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing['3xl'] }]}
      >
        {/* Enable companion toggle */}
        <Card padding="default">
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleLabel}>Enable AI Companion</Text>
              <Text style={styles.toggleCaption}>
                Show Aria on your home screen and receive personalised guidance
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.surfaceSunk, true: colors.accent }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>

        {enabled && (
          <>
            {/* Personality */}
            <Text style={styles.sectionLabel}>PERSONALITY</Text>
            <Card padding="default" style={styles.personalityCard}>
              {PERSONALITIES.map((p) => (
                <Pressable
                  key={p.value}
                  style={[
                    styles.personalityRow,
                    personality === p.value && styles.personalityRowSelected,
                  ]}
                  onPress={() => setPersonality(p.value)}
                >
                  <View style={styles.personalityText}>
                    <Text style={styles.personalityLabel}>{p.label}</Text>
                    <Text style={styles.personalityCaption}>{p.caption}</Text>
                  </View>
                  <View style={[styles.radio, personality === p.value && styles.radioSelected]}>
                    {personality === p.value && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              ))}
            </Card>

            {/* Notifications */}
            <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
            {!notificationsGranted ? (
              <Card padding="default">
                <Text style={styles.noNotifTitle}>Notifications are off</Text>
                <Text style={styles.noNotifCaption}>
                  You declined notifications during setup. You can re-enable them in your device Settings → FitMedia.
                </Text>
              </Card>
            ) : (
              <Card padding="none">
                {NOTIF_CATEGORIES.map((cat, i) => (
                  <View key={cat.key}>
                    <View style={styles.notifRow}>
                      <View style={styles.notifText}>
                        <Text style={styles.notifLabel}>{cat.label}</Text>
                        <Text style={styles.notifCaption}>
                          {cat.caption} · {cat.time}
                        </Text>
                      </View>
                      <Switch
                        value={categories[cat.key]}
                        onValueChange={(v) => setCategory(cat.key, v)}
                        trackColor={{ false: colors.surfaceSunk, true: colors.accent }}
                        thumbColor={colors.surface}
                      />
                    </View>
                    {i < NOTIF_CATEGORIES.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                ))}
              </Card>
            )}

            {/* Tutorial */}
            <Text style={styles.sectionLabel}>TUTORIAL</Text>
            <Card padding="default">
              <View style={styles.tutorialRow}>
                <View style={styles.tutorialText}>
                  <Text style={styles.tutorialLabel}>Replay Tutorial</Text>
                  <Text style={styles.tutorialCaption}>
                    See the app introduction and Aria's tour again
                  </Text>
                </View>
              </View>
              <Button
                label="Replay Tour"
                variant="secondary"
                fullWidth
                icon={RotateCcw}
                onPress={() => {
                  replayTutorial();
                  router.back();
                }}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  } satisfies ViewStyle,
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } satisfies ViewStyle,
  headerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  title: { ...(typography.subheading as TextStyle) } satisfies TextStyle,

  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.md,
  } satisfies ViewStyle,

  sectionLabel: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
    marginTop: spacing.xs,
  } satisfies TextStyle,

  // Enable toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } satisfies ViewStyle,
  toggleText: { flex: 1 } satisfies ViewStyle,
  toggleLabel: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  toggleCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 3,
  } satisfies TextStyle,

  // Personality
  personalityCard: { gap: spacing.sm } satisfies ViewStyle,
  personalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
    gap: spacing.md,
  } satisfies ViewStyle,
  personalityRowSelected: {
    backgroundColor: colors.accentSoft,
  } satisfies ViewStyle,
  personalityText: { flex: 1 } satisfies ViewStyle,
  personalityLabel: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  personalityCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.ink4,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  radioSelected: { borderColor: colors.accent } satisfies ViewStyle,
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  } satisfies ViewStyle,

  // Notifications
  noNotifTitle: {
    ...(typography.bodyMedium as TextStyle),
    marginBottom: spacing.xs,
  } satisfies TextStyle,
  noNotifCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    lineHeight: 18,
  } satisfies TextStyle,
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  } satisfies ViewStyle,
  notifText: { flex: 1 } satisfies ViewStyle,
  notifLabel: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  notifCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,
  rowDivider: { height: 1, backgroundColor: colors.divider } satisfies ViewStyle,

  // Tutorial
  tutorialRow: { marginBottom: spacing.xs } satisfies ViewStyle,
  tutorialText: {} satisfies ViewStyle,
  tutorialLabel: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  tutorialCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 3,
  } satisfies TextStyle,
});
