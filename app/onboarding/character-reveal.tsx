import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Button, Card, Chip } from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import type { Database } from '../../types/database';

type InitialStrength = Database['public']['Tables']['initial_strength']['Row'];
type UserProfile = Pick<
  Database['public']['Tables']['users']['Row'],
  'fitness_level' | 'goal' | 'avg_sleep_hours'
>;

// ── SVG ring ────────────────────────────────────────────────────────────────
const RING_SIZE = 140;
const RING_STROKE = 12;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

// ── Score colour mapping (visual only — not part of the scoring formula) ────
function colorForScore(score: number): string {
  if (score >= 60) return colors.success;
  if (score >= 35) return colors.accent;
  return colors.alert;
}

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

/**
 * Estimates a 0–100 score for a single strength movement.
 *
 * Weighted:  Epley 1RM = weight × (1 + reps/30), normalised against a
 *            per-exercise ceiling that represents an "elite" lifter.
 * Bodyweight: reps normalised against a per-exercise ceiling.
 * No data:   returns a neutral 20 as a starting point.
 */
function estimateMovementScore(
  exerciseName: string | null,
  weightKg: number | null,
  reps: number | null,
): number {
  if (!exerciseName) return 20;

  const WEIGHTED_CEILINGS: Record<string, number> = {
    'Bench Press': 120,    // kg 1RM → 100 score
    'Lat Pulldown': 100,
    'Barbell Squat': 150,
  };

  const BODYWEIGHT_CEILINGS: Record<string, number> = {
    'Push-ups': 50,        // reps → 100 score
    'Pull-ups': 25,
    'Bodyweight Squats': 100,
  };

  if (exerciseName in BODYWEIGHT_CEILINGS) {
    if (!reps) return 20;
    return clamp((reps / BODYWEIGHT_CEILINGS[exerciseName]) * 100);
  }

  if (exerciseName in WEIGHTED_CEILINGS) {
    const w = weightKg ?? 0;
    const r = reps ?? 1;
    if (w === 0) return 20;
    const oneRM = w * (1 + r / 30);
    return clamp((oneRM / WEIGHTED_CEILINGS[exerciseName]) * 100);
  }

  return 20;
}

function calcBodyPartScores(s: InitialStrength) {
  const push = estimateMovementScore(s.push_exercise, s.push_weight_kg, s.push_reps);
  const pull = estimateMovementScore(s.pull_exercise, s.pull_weight_kg, s.pull_reps);
  const legs = estimateMovementScore(s.legs_exercise, s.legs_weight_kg, s.legs_reps);

  return {
    chest: push,
    back: pull,
    legs,
    // Arms are secondary in both push and pull; pull is more bicep-dominant
    arms: clamp(push * 0.4 + pull * 0.6),
    // Shoulders are a secondary mover in push
    shoulders: clamp(push * 0.75),
  };
}

export default function CharacterRevealScreen() {
  const { user, setOnboardingComplete } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strength, setStrength] = useState<InitialStrength | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      supabase
        .from('initial_strength')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('users')
        .select('fitness_level, goal, avg_sleep_hours')
        .eq('id', user.id)
        .single(),
    ]).then(([strengthRes, profileRes]) => {
      if (strengthRes.data) setStrength(strengthRes.data);
      if (profileRes.data) setProfile(profileRes.data as UserProfile);
      setLoading(false);
    });
  }, [user]);

  // Derive scores — fall back to neutral 20s if strength data not available
  const scores = strength
    ? calcBodyPartScores(strength)
    : { chest: 20, back: 20, legs: 20, arms: 20, shoulders: 20 };

  const total = clamp(
    (scores.chest + scores.back + scores.legs + scores.arms + scores.shoulders) / 5,
  );

  const bodyParts = [
    { label: 'Chest',     value: scores.chest,     color: colorForScore(scores.chest) },
    { label: 'Back',      value: scores.back,       color: colorForScore(scores.back) },
    { label: 'Arms',      value: scores.arms,       color: colorForScore(scores.arms) },
    { label: 'Shoulders', value: scores.shoulders,  color: colorForScore(scores.shoulders) },
    { label: 'Legs',      value: scores.legs,       color: colorForScore(scores.legs) },
  ];

  const capitalize = (s: string | null | undefined) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : '–';

  const level    = capitalize(profile?.fitness_level);
  const goal     = capitalize(profile?.goal);
  const avgSleep = profile?.avg_sleep_hours != null ? `${profile.avg_sleep_hours}h sleep` : '–';

  const ringOffset = RING_CIRC * (1 - Math.min(total, 100) / 100);

  const handleEnter = async () => {
    if (!user) {
      setError('Please sign in to continue.');
      return;
    }

    setSaving(true);
    setError(null);

    const today = new Date().toISOString().slice(0, 10);

    const { error: scoreError } = await supabase.from('daily_scores').upsert({
      user_id: user.id,
      date: today,
      workout_score: 0,
      diet_score: 0,
      sleep_score: 0,
      balance_score: 0,
      total_score: total,
      body_part_scores: {
        chest:     scores.chest,
        back:      scores.back,
        arms:      scores.arms,
        shoulders: scores.shoulders,
        legs:      scores.legs,
      },
      insights: [{ type: 'info', message: 'Your journey begins here' }],
    });

    if (scoreError) {
      setError(scoreError.message);
      setSaving(false);
      return;
    }

    const { error: userError } = await supabase
      .from('users')
      .update({ onboarding_complete: true })
      .eq('id', user.id);

    if (userError) {
      setError(userError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    // Updating the store triggers the root layout auth gate to navigate to dashboard
    setOnboardingComplete();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your starting score</Text>
        <Text style={styles.subtitle}>
          Based on your strength data and lifestyle answers.
        </Text>

        {/* Score ring card */}
        <Card padding="comfortable" style={styles.ringCard}>
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              {/* Track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke={colors.surfaceSunk}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              {/* Progress */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_R}
                stroke={colors.accent}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={[styles.ringScore, numericStyle]}>{total}</Text>
              <Text style={styles.ringLabel}>/ 100</Text>
            </View>
          </View>
          <Text style={styles.ringCaption}>Starting Body Score</Text>
        </Card>

        {/* Body part bars */}
        <Card padding="default" style={styles.barsCard}>
          <Text style={styles.sectionLabel}>BY BODY PART</Text>
          {bodyParts.map((part) => (
            <View key={part.label} style={styles.barRow}>
              <Text style={styles.barLabel}>{part.label}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${part.value}%` as any, backgroundColor: part.color },
                  ]}
                />
              </View>
              <Text style={[styles.barValue, numericStyle]}>{part.value}</Text>
            </View>
          ))}
        </Card>

        {/* Profile summary chips */}
        <View style={styles.chipRow}>
          <Chip label={level} />
          <Chip label={goal} />
          <Chip label={avgSleep} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={saving ? 'Entering…' : 'Enter App'}
          fullWidth
          disabled={saving}
          onPress={handleEnter}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  scroll: { flex: 1 } satisfies ViewStyle,
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  } satisfies ViewStyle,
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } satisfies ViewStyle,
  title: { ...(typography.display as TextStyle) } satisfies TextStyle,
  subtitle: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  ringCard: {
    alignItems: 'center',
    gap: spacing.md,
  } satisfies ViewStyle,
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  ringScore: {
    ...(typography.displayXl as TextStyle),
  } satisfies TextStyle,
  ringLabel: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  ringCaption: {
    ...(typography.label as TextStyle),
  } satisfies TextStyle,
  barsCard: { gap: spacing.md } satisfies ViewStyle,
  sectionLabel: { ...(typography.label as TextStyle) } satisfies TextStyle,
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } satisfies ViewStyle,
  barLabel: {
    ...(typography.caption as TextStyle),
    width: 72,
    color: colors.ink2,
  } satisfies TextStyle,
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    overflow: 'hidden',
  } satisfies ViewStyle,
  barFill: {
    height: '100%',
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  barValue: {
    ...(typography.caption as TextStyle),
    width: 28,
    textAlign: 'right',
    color: colors.ink2,
  } satisfies TextStyle,
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  } satisfies ViewStyle,
  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
});
