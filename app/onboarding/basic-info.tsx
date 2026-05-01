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

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
] as const;

type Gender = (typeof GENDER_OPTIONS)[number]['value'];

export default function BasicInfoScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!user) {
      setError('Please sign in to continue.');
      return;
    }
    setError(null);
    setSaving(true);

    const ageValue = age ? Number(age) : null;
    const heightValue = height ? Number(height) : null;
    const weightValue = weight ? Number(weight) : null;

    const heightCm = heightValue === null ? null : heightUnit === 'cm' ? heightValue : heightValue * 30.48;
    const weightKg = weightValue === null ? null : weightUnit === 'kg' ? weightValue : weightValue * 0.453592;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        gender,
        age: ageValue,
        height_cm: heightCm,
        weight_kg: weightKg,
      })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push('/onboarding/fitness-level');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Tell us about yourself</Text>
        <Text style={styles.subtitle}>We'll use this to personalise your experience.</Text>

        {/* Gender */}
        <Card padding="default" style={styles.section}>
          <Text style={styles.sectionLabel}>GENDER</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={gender === opt.value}
                onPress={() => setGender(opt.value)}
              />
            ))}
          </View>
        </Card>

        {/* Age */}
        <Card padding="default" style={styles.section}>
          <Text style={styles.sectionLabel}>AGE</Text>
          <Input
            label="Years"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />
        </Card>

        {/* Height */}
        <Card padding="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>HEIGHT</Text>
            <View style={styles.unitRow}>
              <Chip
                label="cm"
                selected={heightUnit === 'cm'}
                onPress={() => setHeightUnit('cm')}
              />
              <Chip
                label="ft"
                selected={heightUnit === 'ft'}
                onPress={() => setHeightUnit('ft')}
              />
            </View>
          </View>
          <Input
            label={heightUnit === 'cm' ? 'Centimetres' : 'Feet'}
            value={height}
            onChangeText={setHeight}
            keyboardType="decimal-pad"
          />
        </Card>

        {/* Weight */}
        <Card padding="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>WEIGHT</Text>
            <View style={styles.unitRow}>
              <Chip
                label="kg"
                selected={weightUnit === 'kg'}
                onPress={() => setWeightUnit('kg')}
              />
              <Chip
                label="lb"
                selected={weightUnit === 'lb'}
                onPress={() => setWeightUnit('lb')}
              />
            </View>
          </View>
          <Input
            label={weightUnit === 'kg' ? 'Kilograms' : 'Pounds'}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
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
  section: { gap: spacing.md } satisfies ViewStyle,
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } satisfies ViewStyle,
  sectionLabel: { ...(typography.label as TextStyle) } satisfies TextStyle,
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  } satisfies ViewStyle,
  unitRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  } satisfies ViewStyle,
  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
    textAlign: 'center',
  } satisfies TextStyle,
});
