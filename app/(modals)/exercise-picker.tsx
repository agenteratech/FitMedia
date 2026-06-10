import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check, Plus } from 'lucide-react-native';
import { useExercises } from '../../hooks/useExercises';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useRoutineStore } from '../../stores/routineStore';
import {
  normalizeMuscleList,
  formatMuscleList,
  primaryMuscleLabel,
} from '../../lib/workouts/muscles';
import { Input, ExerciseThumbnail, Chip } from '../../src/components/primitives';
import { colors, spacing, typography, radius } from '../../src/theme';

// ── Category config ─────────────────────────────────────────────────────────

const CATEGORIES = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Core',
  'Forearms',
  'Full Body',
] as const;

type Category = (typeof CATEGORIES)[number];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Chest: ['chest', 'pectoral', 'pec'],
  Back: ['back', 'lat', 'rhomboid', 'trapezius', 'trap', 'teres', 'rear delt'],
  Shoulders: ['shoulder', 'deltoid', 'delt', 'rotator'],
  Biceps: ['bicep'],
  Triceps: ['tricep'],
  Legs: ['leg', 'quad', 'hamstring', 'glute', 'calf', 'calves', 'hip', 'adductor', 'abductor', 'thigh'],
  Core: ['core', 'abs', 'abdominal', 'oblique', 'transverse'],
  Forearms: ['forearm', 'wrist', 'grip'],
  'Full Body': ['full body', 'full-body', 'whole body'],
};

function matchesCategory(muscles: string[], category: Category): boolean {
  if (category === 'All') return true;
  const keywords = CATEGORY_KEYWORDS[category] ?? [];
  return muscles.some((m) =>
    keywords.some((kw) => m.toLowerCase().includes(kw))
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ExercisePickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const { items, loading } = useExercises();
  const { upsertExercise } = useWorkoutStore();
  const { addExercise } = useRoutineStore();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const filtered = useMemo(() => {
    let result = items;

    if (activeCategory !== 'All') {
      result = result.filter((e) => {
        const muscles = normalizeMuscleList((e as any).primary_muscles);
        return matchesCategory(muscles, activeCategory);
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }

    return result;
  }, [items, search, activeCategory]);

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const selectedItems = items.filter((e) => selected.has(e.id));

    if (target === 'routine') {
      selectedItems.forEach((e) => {
        addExercise({
          exerciseId: e.id,
          name: e.name,
          defaultSets: 3,
          defaultReps: 8,
        });
      });
    } else {
      const existingCount = useWorkoutStore.getState().exercises.length;
      selectedItems.forEach((e, idx) => {
        upsertExercise({
          exerciseId: e.id,
          name: e.name,
          primaryMuscle: primaryMuscleLabel((e as any).primary_muscles),
          orderIndex: existingCount + idx,
          sets: [
            { setNumber: 1, weight: 0, reps: 8, isPR: false, completed: false },
            { setNumber: 2, weight: 0, reps: 8, isPR: false, completed: false },
            { setNumber: 3, weight: 0, reps: 8, isPR: false, completed: false },
          ],
        });
      });
    }

    router.back();
  };

  // Custom exercise — only available in draft (active workout) mode
  const canAddCustom = target === 'draft' && search.trim().length > 0;

  const handleAddCustom = () => {
    const name = search.trim();
    if (!name) return;
    const customId = `custom_${name.toLowerCase().replace(/\W+/g, '_')}_${Date.now()}`;
    const existingCount = useWorkoutStore.getState().exercises.length;
    const muscleHint = activeCategory !== 'All' ? activeCategory : null;
    upsertExercise({
      exerciseId: customId,
      name,
      primaryMuscle: muscleHint,
      orderIndex: existingCount,
      sets: [
        { setNumber: 1, weight: 0, reps: 8, isPR: false, completed: false },
        { setNumber: 2, weight: 0, reps: 8, isPR: false, completed: false },
        { setNumber: 3, weight: 0, reps: 8, isPR: false, completed: false },
      ],
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X size={22} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.title}>Pick Exercises</Text>
        <Pressable
          onPress={handleAdd}
          disabled={selected.size === 0}
          hitSlop={8}
        >
          <Text
            style={[
              styles.addLabel,
              selected.size === 0 && styles.addLabelDisabled,
            ]}
          >
            {selected.size > 0 ? `Add (${selected.size})` : 'Add'}
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Input
          label="Search exercises"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesRow}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            selected={activeCategory === cat}
            onPress={() => setActiveCategory(cat)}
          />
        ))}
      </ScrollView>

      {/* Exercise list */}
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing['2xl'] },
        ]}
        renderItem={({ item }) => {
          const isSel = selected.has(item.id);
          const muscleLabel = formatMuscleList((item as any).primary_muscles);
          return (
            <Pressable
              style={[styles.row, isSel && styles.rowSelected]}
              onPress={() => handleToggle(item.id)}
            >
              <ExerciseThumbnail variant="small" />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                {muscleLabel ? (
                  <Text style={styles.rowMuscle} numberOfLines={1}>
                    {muscleLabel}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.checkBox, isSel && styles.checkBoxSelected]}>
                {isSel ? (
                  <Check size={14} color={colors.surface} strokeWidth={2.5} />
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>
              {loading ? 'Loading exercises…' : 'No exercises found.'}
            </Text>
            {canAddCustom && !loading ? (
              <Pressable style={styles.customRow} onPress={handleAddCustom}>
                <View style={styles.customIcon}>
                  <Plus size={16} color={colors.accent} strokeWidth={2.5} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.customName} numberOfLines={1}>
                    Add "{search.trim()}"
                  </Text>
                  <Text style={styles.customCaption}>Custom exercise</Text>
                </View>
              </Pressable>
            ) : null}
          </View>
        )}
        ListFooterComponent={() => {
          if (!canAddCustom || filtered.length === 0) return null;
          return (
            <>
              <View style={styles.separator} />
              <Pressable style={styles.row} onPress={handleAddCustom}>
                <View style={styles.customIcon}>
                  <Plus size={16} color={colors.accent} strokeWidth={2.5} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.customName} numberOfLines={1}>
                    Add "{search.trim()}"
                  </Text>
                  <Text style={styles.customCaption}>Custom exercise</Text>
                </View>
              </Pressable>
            </>
          );
        }}
        keyboardShouldPersistTaps="handled"
      />
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
  addLabel: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.accent,
  } satisfies TextStyle,
  addLabelDisabled: { color: colors.ink4 } satisfies TextStyle,
  searchWrap: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  } satisfies ViewStyle,

  // Category chips
  categoriesRow: {
    flexGrow: 0,
  } satisfies ViewStyle,
  categoriesContent: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  } satisfies ViewStyle,
  // List
  listContent: {
    paddingHorizontal: spacing['2xl'],
  } satisfies ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  } satisfies ViewStyle,
  rowSelected: {
    backgroundColor: colors.accentSoft,
    marginHorizontal: -spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
  } satisfies ViewStyle,
  rowText: { flex: 1 } satisfies ViewStyle,
  rowName: { ...(typography.body as TextStyle) } satisfies TextStyle,
  rowMuscle: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
    textTransform: 'capitalize',
  } satisfies TextStyle,
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: radius.button,
    borderWidth: 1.5,
    borderColor: colors.ink4,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  checkBoxSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  } satisfies ViewStyle,
  separator: {
    height: 1,
    backgroundColor: colors.divider,
  } satisfies ViewStyle,

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    gap: spacing.md,
  } satisfies ViewStyle,
  empty: {
    ...(typography.body as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
  } satisfies TextStyle,

  // Custom exercise row (in empty state and footer)
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    width: '100%',
  } satisfies ViewStyle,
  customIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  customName: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.accent,
  } satisfies TextStyle,
  customCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 1,
  } satisfies TextStyle,
});
