import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Check, Dumbbell } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { createPost, ensureProfile, type PostType, type WorkoutPostMeta } from '../../lib/community/posts';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

const TYPE_OPTIONS: { label: string; value: PostType }[] = [
  { label: 'Update', value: 'text' },
  { label: 'Workout', value: 'workout' },
  { label: 'PR', value: 'pr' },
  { label: 'Achievement', value: 'achievement' },
];

type RecentWorkout = {
  id: string;
  workout_type: string;
  completed_at: string;
  total_volume_kg: number;
  total_exercises: number;
  total_sets: number;
  duration_minutes: number | null;
};

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [type, setType] = useState<PostType>('text');
  const [caption, setCaption] = useState('');
  const [recent, setRecent] = useState<RecentWorkout | null>(null);
  const [attachWorkout, setAttachWorkout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the user's latest workout to optionally attach.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('workouts')
      .select('id, workout_type, completed_at, total_volume_kg, total_exercises, total_sets, duration_minutes')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRecent((data as unknown) as RecentWorkout | null);
      });
    return () => { cancelled = true; };
  }, [user]);

  // Auto-enable workout attachment when the Workout type is chosen.
  useEffect(() => {
    if (type === 'workout' && recent) setAttachWorkout(true);
    if (type !== 'workout') setAttachWorkout(false);
  }, [type, recent]);

  const canShare = caption.trim().length > 0 || (attachWorkout && !!recent);

  const placeholder = useMemo(() => {
    switch (type) {
      case 'workout': return 'How did the session feel?';
      case 'pr': return 'Share your new personal record! 💪';
      case 'achievement': return 'What did you achieve?';
      default: return "What's on your mind?";
    }
  }, [type]);

  const handleShare = async () => {
    if (!user || !canShare) return;
    setSaving(true);
    setError(null);

    await ensureProfile(user.id);

    let workoutId: string | null = null;
    let meta: WorkoutPostMeta | undefined;
    if (attachWorkout && recent) {
      workoutId = recent.id;
      meta = {
        workoutType: recent.workout_type,
        totalVolumeKg: recent.total_volume_kg,
        totalExercises: recent.total_exercises,
        totalSets: recent.total_sets,
        durationMinutes: recent.duration_minutes,
      };
    }

    const { error } = await createPost({ userId: user.id, type, caption, workoutId, meta });
    setSaving(false);
    if (error) { setError(error); return; }
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.title}>New Post</Text>
        <Pressable onPress={handleShare} disabled={!canShare || saving} hitSlop={8}>
          <Text style={[styles.shareLabel, (!canShare || saving) && styles.shareLabelDisabled]}>
            {saving ? 'Sharing…' : 'Share'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type chips */}
          <View style={styles.chipRow}>
            {TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, type === opt.value && styles.chipActive]}
                onPress={() => setType(opt.value)}
              >
                <Text style={[styles.chipLabel, type === opt.value && styles.chipLabelActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Caption */}
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={placeholder}
            placeholderTextColor={colors.ink3}
            style={styles.input}
            multiline
            autoFocus
            textAlignVertical="top"
          />

          {/* Attach workout */}
          {recent ? (
            <Pressable
              style={[styles.attachCard, attachWorkout && styles.attachCardActive]}
              onPress={() => setAttachWorkout((v) => !v)}
            >
              <View style={styles.attachIcon}>
                <Dumbbell size={18} color={colors.accent} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachTitle} numberOfLines={1}>Attach: {recent.workout_type}</Text>
                <Text style={[styles.attachMeta, numericStyle]} numberOfLines={1}>
                  {recent.total_exercises} exercises · {Math.round(recent.total_volume_kg)} kg
                  {recent.duration_minutes ? ` · ${recent.duration_minutes} min` : ''}
                </Text>
              </View>
              <View style={[styles.checkbox, attachWorkout && styles.checkboxActive]}>
                {attachWorkout ? <Check size={14} color={colors.surface} strokeWidth={2.5} /> : null}
              </View>
            </Pressable>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  title: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  shareLabel: { ...(typography.bodyMedium as TextStyle), color: colors.accent } satisfies TextStyle,
  shareLabelDisabled: { color: colors.ink4 } satisfies TextStyle,
  body: { paddingHorizontal: spacing['2xl'], paddingTop: spacing.lg, gap: spacing.lg } satisfies ViewStyle,

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } satisfies ViewStyle,
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,
  chipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent } satisfies ViewStyle,
  chipLabel: { ...(typography.bodyMedium as TextStyle), fontSize: 13, color: colors.ink2 } satisfies TextStyle,
  chipLabelActive: { color: colors.accent } satisfies TextStyle,

  input: {
    ...(typography.body as TextStyle),
    minHeight: 120,
    color: colors.ink1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    padding: spacing.lg,
  } satisfies TextStyle,

  attachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    padding: spacing.lg,
  } satisfies ViewStyle,
  attachCardActive: { borderColor: colors.accent } satisfies ViewStyle,
  attachIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  attachTitle: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  attachMeta: { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 1 } satisfies TextStyle,
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.ink4,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  checkboxActive: { backgroundColor: colors.accent, borderColor: colors.accent } satisfies ViewStyle,

  error: { ...(typography.caption as TextStyle), color: colors.alert, textAlign: 'center' } satisfies TextStyle,
});
