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
import { Button, Card } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';

const OPTIONS = [
  {
    value: 'beginner',
    title: 'Beginner',
    description:
      'New to training or returning after a long break. Less than 6 months of consistent lifting.',
  },
  {
    value: 'intermediate',
    title: 'Intermediate',
    description:
      'Training consistently for 6+ months. Familiar with compound lifts. Still making regular progress.',
  },
  {
    value: 'advanced',
    title: 'Advanced',
    description:
      '2+ years of serious training. Strong foundation. Progress requires structured programming.',
  },
] as const;

type FitnessLevel = (typeof OPTIONS)[number]['value'];

export default function FitnessLevelScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<FitnessLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!user) {
      setError('Please sign in to continue.');
      return;
    }
    if (!selected) {
      setError('Please choose a level to continue.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('users')
      .update({ fitness_level: selected })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push('/onboarding/strength-test');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What's your experience level?</Text>
        <Text style={styles.subtitle}>
          Be honest — this affects how we calculate your progress.
        </Text>

        {OPTIONS.map((option) => {
          const isSel = selected === option.value;
          return (
            <Pressable key={option.value} onPress={() => setSelected(option.value)}>
              <Card
                padding="comfortable"
                style={[styles.levelCard, isSel && styles.levelCardSelected]}
              >
                <View style={styles.levelTop}>
                  <Text style={[styles.levelTitle, isSel && styles.levelTitleSelected]}>
                    {option.title}
                  </Text>
                  {isSel ? <View style={styles.selectedDot} /> : null}
                </View>
                <Text style={styles.levelDesc}>{option.description}</Text>
              </Card>
            </Pressable>
          );
        })}

        <Card padding="default" style={styles.infoCard}>
          <Text style={styles.infoText}>
            Beginners level up faster. Advanced users need more volume to see gains.
            This mirrors real-world physiology.
          </Text>
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label={saving ? 'Saving…' : 'Continue'}
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
  levelCard: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,
  levelCardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accentSoft,
  } satisfies ViewStyle,
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } satisfies ViewStyle,
  levelTitle: {
    ...(typography.subheading as TextStyle),
  } satisfies TextStyle,
  levelTitleSelected: {
    color: colors.accent,
  } satisfies TextStyle,
  levelDesc: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  } satisfies ViewStyle,
  infoCard: {} satisfies ViewStyle,
  infoText: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
});
