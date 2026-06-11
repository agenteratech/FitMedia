import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Sparkles, LogOut } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Input, Button, Chip, Card } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';
import type { Database } from '../../types/database';

type UserRow = Database['public']['Tables']['users']['Row'];

// ── option lists (unchanged) ────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { label: 'Male',   value: 'male'   },
  { label: 'Female', value: 'female' },
  { label: 'Other',  value: 'other'  },
] as const;

const LEVEL_OPTIONS = [
  { label: 'Beginner',     value: 'beginner'     },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced',     value: 'advanced'     },
] as const;

const GOAL_OPTIONS = [
  { label: 'Bulk',     value: 'bulk'     },
  { label: 'Maintain', value: 'maintain' },
  { label: 'Cut',      value: 'cut'      },
] as const;

const DIET_OPTIONS = [
  { label: 'Consistent',   value: 'consistent'   },
  { label: 'Somewhat',     value: 'somewhat'     },
  { label: 'Not Tracking', value: 'not_tracking' },
] as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => { signOut(); } },
      ],
    );
  };
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    name:     '',
    height:   '',
    weight:   '',
    age:      '',
    gender:   'other',
    level:    'beginner',
    goal:     'maintain',
    sleep:    '',
    diet:     'somewhat',
    calories: '',
  });

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) { setProfile(null); return; }

      setLoading(true);
      setError(null);

      // maybeSingle() returns null data (no error) when no row exists.
      // single() would throw PGRST116 for accounts whose users row was
      // never created by the Supabase trigger, breaking the profile screen.
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) { setError(error.message); setLoading(false); return; }

      // Row missing — create a minimal record so the screen works immediately.
      if (!data) {
        const { data: created, error: insertError } = await supabase
          .from('users')
          .upsert({ id: user.id, email: user.email ?? '' }, { onConflict: 'id' })
          .select()
          .single();
        if (insertError) { setError(insertError.message); setLoading(false); return; }
        data = created;
      }

      if (!data) { setLoading(false); return; }

      setProfile(data);
      const row = data as typeof data & { calorie_target?: number | null };
      setForm({
        name:     data.name ?? '',
        height:   data.height_cm        ? String(data.height_cm)        : '',
        weight:   data.weight_kg        ? String(data.weight_kg)        : '',
        age:      data.age              ? String(data.age)              : '',
        gender:   data.gender           ?? 'other',
        level:    data.fitness_level    ?? 'beginner',
        goal:     data.goal             ?? 'maintain',
        sleep:    data.avg_sleep_hours  ? String(data.avg_sleep_hours)  : '',
        diet:     data.diet_consistency ?? 'somewhat',
        calories: row.calorie_target    ? String(row.calorie_target)    : '',
      });
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  // ── validation (unchanged) ─────────────────────────────────────────────
  const validate = (): string | null => {
    const height = form.height ? Number(form.height) : null;
    const weight = form.weight ? Number(form.weight) : null;
    const age    = form.age    ? Number(form.age)    : null;
    const sleep  = form.sleep  ? Number(form.sleep)  : null;

    if (height !== null && (isNaN(height) || height < 50 || height > 300))
      return 'Height must be between 50 and 300 cm.';
    if (weight !== null && (isNaN(weight) || weight < 20 || weight > 500))
      return 'Weight must be between 20 and 500 kg.';
    if (age !== null && (isNaN(age) || !Number.isInteger(age) || age < 1 || age > 120))
      return 'Age must be a whole number between 1 and 120.';
    if (sleep !== null && (isNaN(sleep) || sleep < 0 || sleep > 24))
      return 'Sleep hours must be between 0 and 24.';
    const calories = form.calories ? Number(form.calories) : null;
    if (calories !== null && (isNaN(calories) || !Number.isInteger(calories) || calories < 500 || calories > 10000))
      return 'Calorie target must be a whole number between 500 and 10,000.';
    return null;
  };

  // ── save (unchanged) ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) { setError('Please sign in to continue.'); return; }

    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setSaved(false);
    setError(null);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        name:             form.name || null,
        height_cm:        form.height ? Number(form.height)           : null,
        weight_kg:        form.weight ? Number(form.weight)           : null,
        age:              form.age    ? Math.round(Number(form.age))  : null,
        gender:           form.gender           as UserRow['gender'],
        fitness_level:    form.level            as UserRow['fitness_level'],
        goal:             form.goal             as UserRow['goal'],
        avg_sleep_hours:  form.sleep    ? Number(form.sleep)              : null,
        diet_consistency: form.diet               as UserRow['diet_consistency'],
        ...(form.calories ? { calorie_target: Math.round(Number(form.calories)) } : {}),
      } as any)
      .eq('id', user.id);

    setSaving(false);

    if (updateError) { setError(updateError.message); return; }

    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 3000);
  };

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
      >
        <Text style={typography.heading}>Profile</Text>

        {/* AI Companion shortcut */}
        <Pressable
          style={({ pressed }) => [styles.companionCard, pressed && styles.companionCardPressed]}
          onPress={() => router.push('/(modals)/companion-settings')}
        >
          <View style={styles.companionAvatar}>
            <Sparkles size={18} color={colors.accent} strokeWidth={1.75} />
          </View>
          <View style={styles.companionText}>
            <Text style={styles.companionLabel}>AI Companion · Aria</Text>
            <Text style={styles.companionCaption}>Personality, notifications &amp; reminders</Text>
          </View>
          <ChevronRight size={16} color={colors.ink4} strokeWidth={1.75} />
        </Pressable>

        {loading ? (
          <Text style={styles.status}>Loading profile…</Text>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {saved ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>Changes saved</Text>
          </View>
        ) : null}

        {/* Email row */}
        {profile ? (
          <Card padding="compact">
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{profile.email}</Text>
          </Card>
        ) : null}

        {/* Basic stats */}
        <Card padding="default">
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.fieldGap}>
            <Input
              label="Name"
              value={form.name}
              onChangeText={(name) => setForm((p) => ({ ...p, name }))}
              autoCapitalize="words"
            />
            <Input
              label="Height (cm)"
              value={form.height}
              onChangeText={(height) => setForm((p) => ({ ...p, height }))}
              keyboardType="decimal-pad"
            />
            <Input
              label="Weight (kg)"
              value={form.weight}
              onChangeText={(weight) => setForm((p) => ({ ...p, weight }))}
              keyboardType="decimal-pad"
            />
            <Input
              label="Age"
              value={form.age}
              onChangeText={(age) => setForm((p) => ({ ...p, age }))}
              keyboardType="number-pad"
            />
            <Input
              label="Daily Calorie Target (kcal)"
              value={form.calories}
              onChangeText={(calories) => setForm((p) => ({ ...p, calories }))}
              keyboardType="number-pad"
            />
          </View>
        </Card>

        {/* Goal & level */}
        <Card padding="default">
          <Text style={styles.sectionTitle}>Goal &amp; Level</Text>
          <Text style={styles.chipGroupLabel}>Fitness Level</Text>
          <View style={styles.chipRow}>
            {LEVEL_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={form.level === opt.value}
                onPress={() => setForm((p) => ({ ...p, level: opt.value }))}
              />
            ))}
          </View>
          <Text style={styles.chipGroupLabel}>Goal</Text>
          <View style={styles.chipRow}>
            {GOAL_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={form.goal === opt.value}
                onPress={() => setForm((p) => ({ ...p, goal: opt.value }))}
              />
            ))}
          </View>
        </Card>

        {/* Lifestyle */}
        <Card padding="default">
          <Text style={styles.sectionTitle}>Lifestyle</Text>
          <Text style={styles.chipGroupLabel}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={form.gender === opt.value}
                onPress={() => setForm((p) => ({ ...p, gender: opt.value }))}
              />
            ))}
          </View>
          <Input
            label="Avg Sleep (h)"
            value={form.sleep}
            onChangeText={(sleep) => setForm((p) => ({ ...p, sleep }))}
            keyboardType="decimal-pad"
            style={{ marginTop: spacing.sm }}
          />
          <Text style={styles.chipGroupLabel}>Diet Consistency</Text>
          <View style={styles.chipRow}>
            {DIET_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={form.diet === opt.value}
                onPress={() => setForm((p) => ({ ...p, diet: opt.value }))}
              />
            ))}
          </View>
        </Card>

        <Button
          label={saving ? 'Saving…' : 'Save Changes'}
          fullWidth
          onPress={handleSave}
          disabled={saving}
        />

        {/* Logout — near the bottom of the page, visually separated */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          onPress={handleLogout}
        >
          <LogOut size={18} color={colors.alert} strokeWidth={1.75} />
          <Text style={styles.logoutLabel}>Log Out</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  } satisfies ViewStyle,
  kav: { flex: 1 } satisfies ViewStyle,
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.md,
  } satisfies ViewStyle,
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.alert,
    backgroundColor: 'transparent',
    marginTop: spacing.sm,
  } satisfies ViewStyle,
  logoutBtnPressed: { opacity: 0.7 } satisfies ViewStyle,
  logoutLabel: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.alert,
  } satisfies TextStyle,
  status: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  errorBanner: {
    backgroundColor: '#FDECEA',
    borderRadius: 12,
    padding: spacing.md,
  } satisfies ViewStyle,
  errorText: {
    ...(typography.caption as TextStyle),
    color: colors.alert,
  } satisfies TextStyle,
  successBanner: {
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    padding: spacing.md,
  } satisfies ViewStyle,
  successText: {
    ...(typography.caption as TextStyle),
    color: colors.success,
  } satisfies TextStyle,
  companionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    padding: spacing.lg,
  } satisfies ViewStyle,
  companionCardPressed: { opacity: 0.75 } satisfies ViewStyle,
  companionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } satisfies ViewStyle,
  companionText: { flex: 1 } satisfies ViewStyle,
  companionLabel: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  companionCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,
  fieldLabel: {
    ...(typography.label as TextStyle),
  } satisfies TextStyle,
  fieldValue: {
    ...(typography.body as TextStyle),
    marginTop: 2,
  } satisfies TextStyle,
  sectionTitle: {
    ...(typography.subheading as TextStyle),
    marginBottom: spacing.md,
  } satisfies TextStyle,
  fieldGap: {
    gap: spacing.md,
  } satisfies ViewStyle,
  chipGroupLabel: {
    ...(typography.label as TextStyle),
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  } satisfies TextStyle,
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  } satisfies ViewStyle,
});
