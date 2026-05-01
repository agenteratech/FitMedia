import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Button, Card, Chip, Slider } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';

const GOAL_OPTIONS = [
  {
    value: 'bulk',
    title: 'Bulk',
    description: 'Gain muscle mass with a calorie surplus.',
  },
  {
    value: 'maintain',
    title: 'Maintain',
    description: 'Stay fit and improve strength gradually.',
  },
  {
    value: 'cut',
    title: 'Cut',
    description: 'Lose fat while preserving muscle.',
  },
] as const;

const DIET_OPTIONS = [
  { label: 'Very consistent', value: 'consistent' },
  { label: 'Somewhat consistent', value: 'somewhat' },
  { label: 'Not tracking', value: 'not_tracking' },
] as const;

type GoalValue = (typeof GOAL_OPTIONS)[number]['value'];
type DietValue = (typeof DIET_OPTIONS)[number]['value'];

export default function GoalLifestyleScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [goal, setGoal] = useState<GoalValue | null>(null);
  const [sleep, setSleep] = useState(7);
  const [dietConsistency, setDietConsistency] = useState<DietValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!user) {
      setError('Please sign in to continue.');
      return;
    }
    if (!goal || !dietConsistency) {
      setError('Please select your goal and diet consistency.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        goal,
        avg_sleep_hours: sleep,
        diet_consistency: dietConsistency,
      })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push('/onboarding/character-reveal');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What's your goal?</Text>
        <Text style={styles.subtitle}>
          This shapes how we evaluate your nutrition and training.
        </Text>

        {/* Goal selection */}
        {GOAL_OPTIONS.map((option) => {
          const isSel = goal === option.value;
          return (
            <Pressable key={option.value} onPress={() => setGoal(option.value)}>
              <Card
                padding="comfortable"
                style={[styles.goalCard, isSel && styles.goalCardSelected]}
              >
                <View style={styles.goalTop}>
                  <Text style={[styles.goalTitle, isSel && styles.goalTitleSelected]}>
                    {option.title}
                  </Text>
                  {isSel ? <View style={styles.selectedDot} /> : null}
                </View>
                <Text style={styles.goalDesc}>{option.description}</Text>
              </Card>
            </Pressable>
          );
        })}

        {/* Sleep slider */}
        <Card padding="default" style={styles.section}>
          <Slider
            label="Average sleep"
            value={sleep}
            minimumValue={4}
            maximumValue={10}
            step={1}
            onValueChange={setSleep}
            formatValue={(v) => `${v}h`}
          />
        </Card>

        {/* Diet consistency */}
        <Card padding="default" style={styles.section}>
          <Text style={styles.sectionLabel}>DIET CONSISTENCY</Text>
          <View style={styles.chipRow}>
            {DIET_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={dietConsistency === opt.value}
                onPress={() => setDietConsistency(opt.value)}
              />
            ))}
          </View>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={saving ? 'Saving…' : 'See My Stats'}
          fullWidth
          disabled={saving}
          onPress={handleContinue}
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
  title: { ...(typography.display as TextStyle) } satisfies TextStyle,
  subtitle: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  goalCard: {
    gap: spacing.sm,
  } satisfies ViewStyle,
  goalCardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accentSoft,
  } satisfies ViewStyle,
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } satisfies ViewStyle,
  goalTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  goalTitleSelected: { color: colors.accent } satisfies TextStyle,
  goalDesc: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  } satisfies ViewStyle,
  section: { gap: spacing.sm } satisfies ViewStyle,
  sectionLabel: { ...(typography.label as TextStyle) } satisfies TextStyle,
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
