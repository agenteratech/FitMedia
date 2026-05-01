import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Input, Button, Card, Chip } from '../../src/components/primitives';
import { colors, spacing, typography } from '../../src/theme';

type StrengthOption = 'weighted' | 'bodyweight';

interface StrengthSectionProps {
  title: string;
  subtitle: string;
  weightedLabel: string;
  bodyweightLabel: string;
  selected: StrengthOption;
  onSelect: (v: StrengthOption) => void;
  weightValue: string;
  repsValue: string;
  onWeightChange: (v: string) => void;
  onRepsChange: (v: string) => void;
}

function StrengthSection({
  title,
  subtitle,
  weightedLabel,
  bodyweightLabel,
  selected,
  onSelect,
  weightValue,
  repsValue,
  onWeightChange,
  onRepsChange,
}: StrengthSectionProps) {
  return (
    <Card padding="default" style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{subtitle}</Text>
      <View style={styles.chipRow}>
        <Chip
          label={weightedLabel}
          selected={selected === 'weighted'}
          onPress={() => onSelect('weighted')}
        />
        <Chip
          label={bodyweightLabel}
          selected={selected === 'bodyweight'}
          onPress={() => onSelect('bodyweight')}
        />
      </View>
      {selected === 'weighted' ? (
        <View style={styles.inputRow}>
          <Input
            label="Weight (kg)"
            value={weightValue}
            onChangeText={onWeightChange}
            keyboardType="decimal-pad"
            style={styles.halfInput}
          />
          <Input
            label="Reps"
            value={repsValue}
            onChangeText={onRepsChange}
            keyboardType="number-pad"
            style={styles.halfInput}
          />
        </View>
      ) : (
        <Input
          label="Reps"
          value={repsValue}
          onChangeText={onRepsChange}
          keyboardType="number-pad"
        />
      )}
    </Card>
  );
}

export default function StrengthTestScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [pushType, setPushType] = useState<StrengthOption>('weighted');
  const [pushWeight, setPushWeight] = useState('');
  const [pushReps, setPushReps] = useState('');

  const [pullType, setPullType] = useState<StrengthOption>('weighted');
  const [pullWeight, setPullWeight] = useState('');
  const [pullReps, setPullReps] = useState('');

  const [legsType, setLegsType] = useState<StrengthOption>('weighted');
  const [legsWeight, setLegsWeight] = useState('');
  const [legsReps, setLegsReps] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!user) {
      setError('Please sign in to continue.');
      return;
    }
    setError(null);
    setSaving(true);

    const pushExercise = pushType === 'weighted' ? 'Bench Press' : 'Push-ups';
    const pullExercise = pullType === 'weighted' ? 'Lat Pulldown' : 'Pull-ups';
    const legsExercise = legsType === 'weighted' ? 'Barbell Squat' : 'Bodyweight Squats';

    const { error: insertError } = await supabase.from('initial_strength').insert({
      user_id: user.id,
      push_exercise: pushExercise,
      push_weight_kg: pushType === 'weighted' ? Number(pushWeight || 0) : null,
      push_reps: Number(pushReps || 0) || null,
      pull_exercise: pullExercise,
      pull_weight_kg: pullType === 'weighted' ? Number(pullWeight || 0) : null,
      pull_reps: Number(pullReps || 0) || null,
      legs_exercise: legsExercise,
      legs_weight_kg: legsType === 'weighted' ? Number(legsWeight || 0) : null,
      legs_reps: Number(legsReps || 0) || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push('/onboarding/goal-lifestyle');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Let's estimate your strength</Text>
        <Text style={styles.subtitle}>
          Pick one option per category. Don't worry — this is just a starting point.
        </Text>

        <StrengthSection
          title="Push Strength"
          subtitle="Target: Chest, shoulders, triceps"
          weightedLabel="Bench Press"
          bodyweightLabel="Push-ups"
          selected={pushType}
          onSelect={setPushType}
          weightValue={pushWeight}
          repsValue={pushReps}
          onWeightChange={setPushWeight}
          onRepsChange={setPushReps}
        />

        <StrengthSection
          title="Pull Strength"
          subtitle="Target: Back, biceps"
          weightedLabel="Lat Pulldown"
          bodyweightLabel="Pull-ups"
          selected={pullType}
          onSelect={setPullType}
          weightValue={pullWeight}
          repsValue={pullReps}
          onWeightChange={setPullWeight}
          onRepsChange={setPullReps}
        />

        <StrengthSection
          title="Leg Strength"
          subtitle="Target: Quads, hamstrings, glutes"
          weightedLabel="Barbell Squat"
          bodyweightLabel="Bodyweight Squats"
          selected={legsType}
          onSelect={setLegsType}
          weightValue={legsWeight}
          repsValue={legsReps}
          onWeightChange={setLegsWeight}
          onRepsChange={setLegsReps}
        />

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
  section: { gap: spacing.md } satisfies ViewStyle,
  sectionTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  sectionSub: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  } satisfies ViewStyle,
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  } satisfies ViewStyle,
  halfInput: { flex: 1 } satisfies ViewStyle,
  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
});
