import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronRight, Dumbbell, Plus, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { primaryMuscleLabel } from '../../lib/workouts/muscles';
import { useRoutines } from '../../hooks/useRoutines';
import { useAuthStore } from '../../stores/authStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { RoutineCard, Button, Chip, Sheet } from '../../src/components/primitives';
import { colors, spacing, typography, radius, numericStyle } from '../../src/theme';
import {
  INFLUENCER_TEMPLATES,
  type InfluencerTemplate,
} from '../../lib/templates/influencerRoutines';

const FILTERS = ['All', 'Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'] as const;
type Filter = typeof FILTERS[number];

const FILTER_MUSCLES: Record<string, string[]> = {
  Push:        ['chest', 'shoulder', 'tricep', 'push'],
  Pull:        ['back', 'bicep', 'lat', 'row', 'pull', 'rear delt', 'rhomboid'],
  Legs:        ['quad', 'hamstring', 'glute', 'calf', 'leg', 'hip', 'adduct', 'abduct'],
  Upper:       ['chest', 'shoulder', 'tricep', 'back', 'bicep', 'lat', 'delt'],
  Lower:       ['quad', 'hamstring', 'glute', 'calf', 'leg', 'hip'],
  'Full Body': [],
};

// ─── Exercise DB matching ─────────────────────────────────────────────────────
async function findExerciseId(searchName: string): Promise<string | null> {
  // 1. Exact case-insensitive match
  const { data: exact } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', searchName)
    .limit(1);
  if (exact?.length) return exact[0].id;

  // 2. Partial match — search name contained anywhere in the exercise name
  const { data: partial } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', `%${searchName}%`)
    .limit(1);
  return partial?.[0]?.id ?? null;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RoutinesScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { items, loading, refetch } = useRoutines();
  const { reset, setWorkoutType, setStartedAt, upsertExercise } = useWorkoutStore();

  const [filter, setFilter] = useState<Filter>('All');

  // Options sheet for user routines
  const [sheetRoutineId, setSheetRoutineId] = useState<string | null>(null);
  const sheetRoutine = useMemo(
    () => items.find((r) => r.id === sheetRoutineId) ?? null,
    [items, sheetRoutineId],
  );

  // Template detail sheet
  const [selectedTemplate, setSelectedTemplate] = useState<InfluencerTemplate | null>(null);
  const [selectedDayIdx,   setSelectedDayIdx]   = useState(0);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'All' || filter === 'Full Body') return items;
    const keywords = FILTER_MUSCLES[filter] ?? [];
    return items.filter((r) => {
      if (r.name.toLowerCase().includes(filter.toLowerCase())) return true;
      return r.user_routine_exercises.some((rex) => {
        const raw = rex.exercises?.primary_muscles;
        const muscles = (Array.isArray(raw) ? raw.join(' ') : (raw ?? '')).toLowerCase();
        return keywords.some((kw) => muscles.includes(kw));
      });
    });
  }, [items, filter]);

  const handleStartRoutine = (routineId: string) => {
    const routine = items.find((r) => r.id === routineId);
    if (!routine) return;
    reset();
    setWorkoutType(routine.name);
    setStartedAt(new Date().toISOString());
    [...routine.user_routine_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((rex, idx) => {
        upsertExercise({
          exerciseId:    rex.exercise_id,
          name:          rex.exercises?.name ?? 'Exercise',
          primaryMuscle: primaryMuscleLabel(rex.exercises?.primary_muscles),
          orderIndex: idx,
          sets: Array.from({ length: rex.default_sets }, (_, i) => ({
            setNumber: i + 1, weight: 0, reps: rex.default_reps, completed: false, isPR: false,
          })),
        });
      });
    router.push(`/(modals)/active-workout?routineId=${routineId}`);
  };

  const routineToSummary = (r: typeof items[number]) => ({
    id: r.id,
    name: r.name,
    exerciseNames: [...r.user_routine_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map((rex) => rex.exercises?.name ?? 'Unknown'),
  });

  const handleDelete = async (routineId: string) => {
    const { error } = await supabase.from('user_routines').delete().eq('id', routineId);
    if (error) Alert.alert('Error', 'Could not delete routine. Please try again.');
    else refetch();
  };

  const confirmDelete = (routineId: string, name: string) => {
    setSheetRoutineId(null);
    setTimeout(() => {
      Alert.alert(
        'Delete Routine',
        `Delete "${name}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => handleDelete(routineId) },
        ],
      );
    }, 350);
  };

  // ── Add a template day to user's routines ──────────────────────────────────
  const handleAddTemplateDay = async () => {
    if (!selectedTemplate || !user || adding) return;
    setAdding(true);
    try {
      const day  = selectedTemplate.days[selectedDayIdx];
      const name = `${selectedTemplate.name} – ${day.label}`;

      const { data: routine, error: rErr } = await supabase
        .from('user_routines')
        .insert({ user_id: user.id, name })
        .select('id')
        .single();

      if (rErr || !routine) throw new Error('Failed to create routine');

      // Match each exercise to the DB in parallel
      const exerciseIds = await Promise.all(
        day.exercises.map((ex) => findExerciseId(ex.searchName)),
      );

      const inserts = day.exercises
        .map((ex, i) => ({ ex, id: exerciseIds[i] }))
        .filter(({ id }) => id !== null)
        .map(({ ex, id }, orderIndex) => ({
          routine_id:    routine.id,
          exercise_id:   id!,
          order_index:   orderIndex,
          default_sets:  ex.sets,
          default_reps:  ex.reps,
        }));

      if (inserts.length > 0) {
        await supabase.from('user_routine_exercises').insert(inserts);
      }

      await refetch();
      setSelectedTemplate(null);
      Alert.alert(
        'Added!',
        `"${name}" saved with ${inserts.length} of ${day.exercises.length} exercise${day.exercises.length !== 1 ? 's' : ''}.`,
      );
    } catch {
      Alert.alert('Error', 'Could not add routine. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const openTemplate = (t: InfluencerTemplate) => {
    setSelectedDayIdx(0);
    setSelectedTemplate(t);
  };

  const accentColor = (key: 'accent' | 'success') =>
    key === 'accent' ? colors.accent : colors.success;
  const accentBg = (key: 'accent' | 'success') =>
    key === 'accent' ? colors.accentSoft : colors.successSoft;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* ── Fixed header ───────────────────────────────────────── */}
      <View>
        <View style={styles.header}>
          <Text style={typography.heading}>Routines</Text>
          <Pressable
            onPress={() => router.push('/(modals)/create-routine')}
            hitSlop={8}
            accessibilityLabel="Create routine"
          >
            <Plus size={22} color={colors.ink2} strokeWidth={1.75} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          style={styles.filtersScroll}
        >
          {FILTERS.map((chip) => (
            <Chip key={chip} label={chip} selected={filter === chip} onPress={() => setFilter(chip)} />
          ))}
        </ScrollView>
      </View>

      {/* ── Options sheet (delete user routine) ────────────────── */}
      <Sheet visible={sheetRoutineId !== null} onClose={() => setSheetRoutineId(null)}>
        <Text style={styles.sheetTitle} numberOfLines={1}>{sheetRoutine?.name ?? ''}</Text>
        <View style={styles.sheetDivider} />
        <Pressable
          style={styles.sheetRow}
          onPress={() => confirmDelete(sheetRoutineId!, sheetRoutine?.name ?? '')}
        >
          <Trash2 size={20} color={colors.alert} strokeWidth={1.75} />
          <Text style={styles.sheetDestructiveLabel}>Delete Routine</Text>
        </Pressable>
        <View style={[styles.sheetCancelWrap, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button label="Cancel" variant="secondary" fullWidth onPress={() => setSheetRoutineId(null)} />
        </View>
      </Sheet>

      {/* ── Template detail sheet ───────────────────────────────── */}
      <Sheet
        visible={selectedTemplate !== null}
        onClose={() => setSelectedTemplate(null)}
        snapPoints={['88%']}
        scrollable
        scrollContentStyle={[styles.tSheetScroll, { paddingBottom: insets.bottom + spacing['3xl'] }]}
      >
        {selectedTemplate && (
          <>
            {/* Influencer header */}
            <View style={styles.tSheetHeader}>
              <View style={[styles.tSheetAvatar, { backgroundColor: accentBg(selectedTemplate.accentKey) }]}>
                <Text style={[styles.tSheetAvatarText, { color: accentColor(selectedTemplate.accentKey) }]}>
                  {selectedTemplate.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </Text>
              </View>
              <View style={styles.tSheetMeta}>
                <Text style={styles.tSheetName}>{selectedTemplate.name}</Text>
                <Text style={styles.tSheetAlias}>"{selectedTemplate.alias}"</Text>
                <View style={[styles.tSheetBadge, { backgroundColor: accentBg(selectedTemplate.accentKey) }]}>
                  <Text style={[styles.tSheetBadgeText, { color: accentColor(selectedTemplate.accentKey) }]}>
                    {selectedTemplate.badge}
                  </Text>
                </View>
              </View>
            </View>

            {/* Philosophy */}
            <Text style={styles.tSheetPhilosophy} numberOfLines={3}>
              {selectedTemplate.philosophy}
            </Text>

            <View style={styles.tSheetSplitRow}>
              <Text style={[styles.tSheetSplitText, { color: accentColor(selectedTemplate.accentKey) }]}>
                {selectedTemplate.splitType}
              </Text>
            </View>

            {/* Day picker */}
            <Text style={styles.tSheetSectionLabel}>SELECT WORKOUT DAY</Text>
            <GHScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tDayRow}
            >
              {selectedTemplate.days.map((day, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.tDayChip,
                    i === selectedDayIdx && {
                      backgroundColor: accentBg(selectedTemplate.accentKey),
                      borderColor: accentColor(selectedTemplate.accentKey),
                    },
                  ]}
                  onPress={() => setSelectedDayIdx(i)}
                >
                  <Text
                    style={[
                      styles.tDayChipText,
                      i === selectedDayIdx && { color: accentColor(selectedTemplate.accentKey) },
                    ]}
                    numberOfLines={2}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              ))}
            </GHScrollView>

            {/* Exercise list for selected day */}
            <Text style={styles.tSheetSectionLabel}>
              EXERCISES · {selectedTemplate.days[selectedDayIdx].exercises.length} MOVEMENTS
            </Text>
            <View style={styles.tExerciseList}>
              {selectedTemplate.days[selectedDayIdx].exercises.map((ex, i, arr) => (
                <View key={i} style={[styles.tExRow, i < arr.length - 1 && styles.tExRowBorder]}>
                  <View style={[styles.tExNum, { backgroundColor: accentBg(selectedTemplate.accentKey) }]}>
                    <Text style={[styles.tExNumText, { color: accentColor(selectedTemplate.accentKey) }, numericStyle]}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text style={styles.tExName} numberOfLines={2}>{ex.displayName}</Text>
                  <Text style={[styles.tExSets, numericStyle]}>
                    {ex.sets}×{ex.reps}
                  </Text>
                </View>
              ))}
            </View>

            {/* Add CTA */}
            <Button
              label={adding ? 'Adding…' : 'Add to My Routines'}
              fullWidth
              onPress={handleAddTemplateDay}
              disabled={adding}
              style={{ marginTop: spacing.lg }}
            />
          </>
        )}
      </Sheet>

      {/* ── Main scrollable content ─────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Explore Templates ─────────────────────────────────── */}
        <Text style={styles.sectionLabel}>EXPLORE TEMPLATES</Text>
        {/* Negative margin to break out of scrollContent padding and go full-width */}
        <View style={styles.templateBreakout}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateCardsRow}
          >
            {INFLUENCER_TEMPLATES.map((t) => (
              <Pressable
                key={t.id}
                style={({ pressed }) => [
                  styles.tCard,
                  pressed && styles.tCardPressed,
                ]}
                onPress={() => openTemplate(t)}
              >
                <View style={[styles.tCardAvatar, { backgroundColor: accentBg(t.accentKey) }]}>
                  <Text style={[styles.tCardAvatarText, { color: accentColor(t.accentKey) }]}>
                    {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                  </Text>
                </View>
                <Text style={styles.tCardName} numberOfLines={1}>{t.name}</Text>
                <Text style={styles.tCardAlias} numberOfLines={1}>"{t.alias}"</Text>
                <Text style={styles.tCardSplit} numberOfLines={2}>{t.splitType}</Text>
                <View style={styles.tCardFooter}>
                  <Text style={[styles.tCardExplore, { color: accentColor(t.accentKey) }]}>
                    Explore
                  </Text>
                  <ChevronRight size={12} color={accentColor(t.accentKey)} strokeWidth={2} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── My Routines ───────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
          {filter === 'All'
            ? `MY ROUTINES${items.length > 0 ? ` (${items.length})` : ''}`
            : `${filter.toUpperCase()}${filtered.length > 0 ? ` (${filtered.length})` : ''}`}
        </Text>

        {loading ? (
          <Text style={styles.hint}>Loading routines…</Text>
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Dumbbell size={28} color={colors.ink4} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptyCaption}>
              Create your first routine or add one from the templates above.
            </Text>
            <Button
              label="Create Routine"
              fullWidth
              onPress={() => router.push('/(modals)/create-routine')}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.filterEmptyWrap}>
            <Text style={styles.filterEmptyTitle}>No {filter} routines</Text>
            <Text style={styles.filterEmptyCaption}>Try a different filter or create a new routine.</Text>
          </View>
        ) : (
          <View style={styles.routineList}>
            {filtered.map((r) => (
              <RoutineCard
                key={r.id}
                routine={routineToSummary(r)}
                onStart={() => handleStartRoutine(r.id)}
                onMore={() => setSheetRoutineId(r.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  } satisfies ViewStyle,

  filtersScroll: { height: 52 } satisfies ViewStyle,
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  } satisfies ViewStyle,

  scroll: { flex: 1 } satisfies ViewStyle,
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  } satisfies ViewStyle,

  sectionLabel: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
    marginBottom: spacing.sm,
  } satisfies TextStyle,

  // Template horizontal scroll — break out of scrollContent padding
  templateBreakout: { marginHorizontal: -spacing['2xl'] } satisfies ViewStyle,
  templateCardsRow: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
    paddingBottom: spacing.xs,
  } satisfies ViewStyle,

  // Template card
  tCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    padding: spacing.md,
    gap: spacing.xs,
  } satisfies ViewStyle,
  tCardPressed: { opacity: 0.7 } satisfies ViewStyle,
  tCardAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  } satisfies ViewStyle,
  tCardAvatarText: { ...(typography.subheading as TextStyle), fontSize: 15 } satisfies TextStyle,
  tCardName:  { ...(typography.bodyMedium as TextStyle), fontSize: 13 } satisfies TextStyle,
  tCardAlias: { ...(typography.caption as TextStyle), color: colors.ink3, fontSize: 11 } satisfies TextStyle,
  tCardSplit: { ...(typography.label as TextStyle), color: colors.ink2, fontSize: 11, lineHeight: 16 } satisfies TextStyle,
  tCardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs, gap: 2 } satisfies ViewStyle,
  tCardExplore: { ...(typography.label as TextStyle), fontSize: 11 } satisfies TextStyle,

  // My routines section
  routineList: { gap: spacing.md } satisfies ViewStyle,
  hint: { ...(typography.body as TextStyle), color: colors.ink3 } satisfies TextStyle,

  emptyWrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg } satisfies ViewStyle,
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  } satisfies ViewStyle,
  emptyTitle:   { ...(typography.subheading as TextStyle), marginBottom: spacing.xs } satisfies TextStyle,
  emptyCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
  } satisfies TextStyle,

  filterEmptyWrap:    { alignItems: 'center', paddingTop: spacing['2xl'] } satisfies ViewStyle,
  filterEmptyTitle:   { ...(typography.subheading as TextStyle), marginBottom: spacing.xs } satisfies TextStyle,
  filterEmptyCaption: { ...(typography.caption as TextStyle), color: colors.ink3, textAlign: 'center' } satisfies TextStyle,

  // Options bottom sheet (delete)
  sheetTitle: {
    ...(typography.subheading as TextStyle),
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
  } satisfies TextStyle,
  sheetDivider:  { height: 1, backgroundColor: colors.surfaceElevBorder } satisfies ViewStyle,
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  } satisfies ViewStyle,
  sheetDestructiveLabel: { ...(typography.body as TextStyle), color: colors.alert } satisfies TextStyle,
  sheetCancelWrap: { paddingHorizontal: spacing['2xl'], paddingTop: spacing.md } satisfies ViewStyle,

  // Template detail sheet
  tSheetScroll:     { paddingHorizontal: spacing['2xl'], paddingTop: spacing.md } satisfies ViewStyle,
  tSheetHeader:     { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md } satisfies ViewStyle,
  tSheetAvatar: {
    width: 52,
    height: 52,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } satisfies ViewStyle,
  tSheetAvatarText: { ...(typography.heading as TextStyle), fontSize: 18 } satisfies TextStyle,
  tSheetMeta:       { flex: 1, gap: spacing.xs } satisfies ViewStyle,
  tSheetName:       { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  tSheetAlias:      { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  tSheetBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  tSheetBadgeText:  { ...(typography.label as TextStyle), fontSize: 10 } satisfies TextStyle,
  tSheetPhilosophy: {
    ...(typography.caption as TextStyle),
    color: colors.ink2,
    lineHeight: 19,
    marginBottom: spacing.sm,
  } satisfies TextStyle,
  tSheetSplitRow:   { marginBottom: spacing.lg } satisfies ViewStyle,
  tSheetSplitText:  { ...(typography.bodyMedium as TextStyle), fontSize: 13 } satisfies TextStyle,
  tSheetSectionLabel: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
    marginBottom: spacing.sm,
  } satisfies TextStyle,

  // Day chips inside sheet
  tDayRow: { gap: spacing.sm, paddingBottom: spacing.md } satisfies ViewStyle,
  tDayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.buttonCompact,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    backgroundColor: colors.surface,
    maxWidth: 160,
  } satisfies ViewStyle,
  tDayChipText: {
    ...(typography.label as TextStyle),
    color: colors.ink2,
    fontSize: 12,
    lineHeight: 17,
  } satisfies TextStyle,

  // Exercise list inside sheet
  tExerciseList: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  } satisfies ViewStyle,
  tExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  } satisfies ViewStyle,
  tExRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.surfaceSunk } satisfies ViewStyle,
  tExNum: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } satisfies ViewStyle,
  tExNumText:  { ...(typography.label as TextStyle), fontSize: 11 } satisfies TextStyle,
  tExName:     { ...(typography.caption as TextStyle), color: colors.ink1, flex: 1, lineHeight: 18 } satisfies TextStyle,
  tExSets:     { ...(typography.label as TextStyle), color: colors.ink3, fontSize: 11 } satisfies TextStyle,
});
