import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { recalculateScores } from '../../lib/scoreEngine';
import { Input, Button, Card, Chip } from '../../src/components/primitives';
import { colors, spacing, typography } from '../../src/theme';

// Fraction of bodyweight actually lifted for each bodyweight movement.
// Push-ups: ~65% BW | Pull-ups: 100% BW | Bodyweight squats: ~65% BW
const BW_FRACTIONS = { push: 0.65, pull: 1.0, legs: 0.65 };

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

  const [bodyWeightKg, setBodyWeightKg] = useState(70);

  const [pushType, setPushType] = useState<StrengthOption>('weighted');
  const [pushWeight, setPushWeight] = useState('');
  const [pushReps, setPushReps]  = useState('');

  const [pullType, setPullType] = useState<StrengthOption>('weighted');
  const [pullWeight, setPullWeight] = useState('');
  const [pullReps, setPullReps]  = useState('');

  const [legsType, setLegsType] = useState<StrengthOption>('weighted');
  const [legsWeight, setLegsWeight] = useState('');
  const [legsReps, setLegsReps]  = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Fetch the user's body weight so we can convert bodyweight reps to kg.
  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('weight_kg')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.weight_kg) setBodyWeightKg(Number(data.weight_kg));
      });
  }, [user]);

  const handleContinue = async () => {
    if (!user) { setError('Please sign in to continue.'); return; }
    setError(null);
    setSaving(true);

    // For bodyweight movements, store the effective load = BW × fraction.
    // The edge function uses this as the "weight_kg" input to the Sstart formula.
    const effectivePushWeight = pushType === 'weighted'
      ? (Number(pushWeight) || null)
      : (pushReps ? bodyWeightKg * BW_FRACTIONS.push : null);

    const effectivePullWeight = pullType === 'weighted'
      ? (Number(pullWeight) || null)
      : (pullReps ? bodyWeightKg * BW_FRACTIONS.pull : null);

    const effectiveLegsWeight = legsType === 'weighted'
      ? (Number(legsWeight) || null)
      : (legsReps ? bodyWeightKg * BW_FRACTIONS.legs : null);

    const { error: upsertError } = await supabase
      .from('initial_strength')
      .upsert(
        {
          user_id:        user.id,
          push_exercise:  pushType  === 'weighted' ? 'Bench Press'       : 'Push-ups',
          push_weight_kg: effectivePushWeight,
          push_reps:      Number(pushReps)  || null,
          pull_exercise:  pullType  === 'weighted' ? 'Lat Pulldown'      : 'Pull-ups',
          pull_weight_kg: effectivePullWeight,
          pull_reps:      Number(pullReps)  || null,
          legs_exercise:  legsType  === 'weighted' ? 'Barbell Squat'     : 'Bodyweight Squats',
          legs_weight_kg: effectiveLegsWeight,
          legs_reps:      Number(legsReps)  || null,
        } as any,
        { onConflict: 'user_id' } as any,
      );

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    // Seed muscle_stats immediately so the home screen shows real values.
    recalculateScores().catch(console.error);

    setSaving(false);
    router.push('/onboarding/goal-lifestyle');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Let's estimate your strength</Text>
          <Text style={styles.subtitle}>
            Do a comfortable set — not a max effort. This sets your starting stats.
            You can skip any section you don't train.
          </Text>

          <StrengthSection
            title="Push Strength"
            subtitle="Chest · Shoulders · Triceps"
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
            subtitle="Back · Biceps"
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
            subtitle="Quads · Hamstrings · Glutes"
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

          <Button
            label="Skip for now"
            variant="ghost"
            fullWidth
            onPress={() => router.push('/onboarding/goal-lifestyle')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  kav:  { flex: 1 } satisfies ViewStyle,
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
