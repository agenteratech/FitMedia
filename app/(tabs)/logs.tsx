import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import { useRouter, useFocusEffect } from 'expo-router';
import { Calendar, Dumbbell, Moon, ChevronLeft, ChevronRight, Plus, X, Search, Repeat2, Zap, MoreHorizontal, Pencil, Trash2 } from 'lucide-react-native';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useDietLogs, type DietLog } from '../../hooks/useDietLogs';
import { useSleepLogs } from '../../hooks/useSleepLogs';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { storage } from '../../lib/storage';
import { takePendingLogsSegment } from '../../lib/logsSegmentRequest';
import { saveDietLog } from '../../lib/diet/saveDietLog';
import {
  searchFoods,
  getFoodDetail,
  pickReferenceServing,
  type FatSecretFood,
  type FatSecretFoodDetail,
  type FatSecretServing,
} from '../../lib/fatsecret/client';
import { saveSleepLog, type SleepQuality } from '../../lib/sleep/saveSleepLog';
import { recalculateScores } from '../../lib/scoreEngine';
import {
  SegmentedControl,
  WeekStrip,
  Card,
  Button,
  Input,
  Chip,
  Sheet,
} from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

// ── Types ──────────────────────────────────────────────────────────────────
type Segment = 'workout' | 'diet' | 'sleep';

const SEGMENT_OPTIONS = [
  { value: 'workout' as const, label: 'Workout' },
  { value: 'diet'    as const, label: 'Diet'    },
  { value: 'sleep'   as const, label: 'Sleep'   },
] as const;

const MEAL_SECTIONS = [
  { id: 'breakfast' as const, label: 'Breakfast' },
  { id: 'lunch'     as const, label: 'Lunch'     },
  { id: 'dinner'    as const, label: 'Dinner'    },
  { id: 'snack'     as const, label: 'Snack'     },
];

const QUALITY_OPTIONS: { label: string; value: SleepQuality }[] = [
  { label: 'Poor', value: 'poor' },
  { label: 'Okay', value: 'okay' },
  { label: 'Good', value: 'good' },
];

const SEGMENT_KEY = 'logs_last_segment';

// ── Calorie ring ────────────────────────────────────────────────────────────
const CAL_SIZE = 160;
const CAL_STROKE = 14;
const CAL_R = (CAL_SIZE - CAL_STROKE) / 2;
const CAL_CIRC = 2 * Math.PI * CAL_R;

// Mifflin-St Jeor TDEE estimate used as default when no manual target is set.
function estimateTDEE(p: {
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  gender?: string | null;
  fitness_level?: string | null;
  goal?: string | null;
}): number {
  if (!p.weight_kg || !p.height_cm || !p.age) return 2400;
  const bmr = p.gender === 'female'
    ? 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age - 161
    : 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + 5;
  const activity = p.fitness_level === 'advanced' ? 1.725
    : p.fitness_level === 'intermediate' ? 1.55 : 1.375;
  const adjustment = p.goal === 'bulk' ? 300 : p.goal === 'cut' ? -300 : 0;
  return Math.max(1200, Math.round(bmr * activity) + adjustment);
}

// ── Date helpers ───────────────────────────────────────────────────────────
function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function shiftDate(d: Date, delta: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + delta);
  return n;
}
function formatMedDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = toIso(new Date());
  if (ymd === today) return 'Today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function LogsScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  // Persist last-active segment in MMKV under key logs_last_segment.
  // On fresh mount, a quick-action request (module-level variable) takes priority.
  const [segment, setSegmentRaw] = useState<Segment>(() => {
    const pending = takePendingLogsSegment();
    if (pending) return pending;
    const saved = storage.getString(SEGMENT_KEY);
    if (saved === 'workout' || saved === 'diet' || saved === 'sleep') return saved;
    return 'workout';
  });
  const setSegment = useCallback((s: Segment) => {
    setSegmentRaw(s);
    storage.set(SEGMENT_KEY, s);
  }, []);

  // Calorie target — manual override takes priority; falls back to TDEE estimate.
  const [calTarget, setCalTarget] = useState(2400);

  // Runs every time this tab gains focus:
  // • consumes any pending quick-action segment request
  // • re-fetches calorie target so changes saved in Profile are reflected immediately
  useFocusEffect(
    useCallback(() => {
      const pending = takePendingLogsSegment();
      if (pending) setSegment(pending);

      if (!user) return;
      supabase
        .from('users')
        .select('calorie_target, weight_kg, height_cm, age, gender, fitness_level, goal')
        .eq('id', user.id)
        .single()
        .then(({ data }: { data: Record<string, any> | null }) => {
          if (!data) return;
          setCalTarget(data.calorie_target ?? estimateTDEE(data));
        });
    }, [user]),
  );

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const selectedYMD = toIso(selectedDate);
  const todayYMD = toIso(new Date());

  // Data
  const { items: workoutItems, loading: workoutLoading } = useWorkoutHistory();
  const { items: dietItems, loading: dietLoading, refetch: refetchDiet } = useDietLogs(selectedYMD);
  const { items: sleepItems, loading: sleepLoading } = useSleepLogs();

  // WeekStrip markers (workout + sleep days from available data)
  const markers = useMemo(() => {
    const m: Record<string, Array<'workout' | 'diet' | 'sleep'>> = {};
    workoutItems.forEach((w) => {
      const ymd = w.completed_at.slice(0, 10);
      if (!m[ymd]) m[ymd] = [];
      if (!m[ymd].includes('workout')) m[ymd].push('workout');
    });
    sleepItems.forEach((s) => {
      if (!m[s.date]) m[s.date] = [];
      if (!m[s.date].includes('sleep')) m[s.date].push('sleep');
    });
    return m;
  }, [workoutItems, sleepItems]);

  // Sheet state
  const [addFoodMealType, setAddFoodMealType] = useState<string | null>(null);
  const [logSleepOpen, setLogSleepOpen] = useState(false);
  const [optionsEntry, setOptionsEntry] = useState<DietLog | null>(null);
  const [editingEntry, setEditingEntry] = useState<DietLog | null>(null);

  // ── Workout data ──────────────────────────────────────────────────────
  const todayWorkouts = useMemo(
    () => workoutItems.filter((w) => w.completed_at.slice(0, 10) === selectedYMD),
    [workoutItems, selectedYMD]
  );

  const weeklySummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const mondayYMD = toIso(monday);
    const thisWeek = workoutItems.filter((w) => w.completed_at.slice(0, 10) >= mondayYMD);
    const workoutDays = new Set(workoutItems.map((w) => w.completed_at.slice(0, 10)));
    let streak = 0;
    const cursor = new Date(today);
    while (workoutDays.has(toIso(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { count: thisWeek.length, streak };
  }, [workoutItems]);

  // ── Diet data ─────────────────────────────────────────────────────────
  const dietTotals = useMemo(() => dietItems.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein:  acc.protein  + (log.protein_g || 0),
      carbs:    acc.carbs    + (log.carbs_g || 0),
      fats:     acc.fats     + (log.fats_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  ), [dietItems]);

  const dietByMeal = useMemo(() => {
    const groups: Record<string, typeof dietItems> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    dietItems.forEach((entry) => {
      const key = (entry.meal_type || 'snack').toLowerCase();
      if (groups[key]) groups[key].push(entry);
      else groups.snack.push(entry);
    });
    return groups;
  }, [dietItems]);

  // ── Sleep data ────────────────────────────────────────────────────────
  const lastNight = sleepItems[0] ?? null;
  const sevenDaySleep = sleepItems.slice(0, 7).reverse();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.heading}>Logs</Text>
        <Pressable onPress={() => setCalendarOpen(true)} style={styles.calIconBtn}>
          <Calendar size={22} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentWrap}>
        <SegmentedControl options={SEGMENT_OPTIONS} value={segment} onChange={setSegment} />
      </View>

      {/* Week strip — bleeds to screen edges */}
      <View style={styles.weekStripOuter}>
        <WeekStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} markers={markers} />
      </View>

      {/* Segment content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        {segment === 'workout' && (
          <WorkoutSegment
            workouts={todayWorkouts}
            loading={workoutLoading}
            weekSummary={weeklySummary}
            selectedYMD={selectedYMD}
            todayYMD={todayYMD}
          />
        )}
        {segment === 'diet' && (
          <DietSegment
            selectedDate={selectedDate}
            selectedYMD={selectedYMD}
            todayYMD={todayYMD}
            onShiftDate={(d) => setSelectedDate(shiftDate(selectedDate, d))}
            totals={dietTotals}
            byMeal={dietByMeal}
            loading={dietLoading}
            onAddFood={(mealType) => setAddFoodMealType(mealType)}
            onItemOptions={(entry) => setOptionsEntry(entry)}
            calorieTarget={calTarget}
          />
        )}
        {segment === 'sleep' && (
          <SleepSegment
            lastNight={lastNight}
            sevenDay={sevenDaySleep}
            recent={sleepItems.slice(0, 5)}
            loading={sleepLoading}
            onLogSleep={() => setLogSleepOpen(true)}
          />
        )}
      </ScrollView>

      {/* Add food sheet */}
      <AddFoodSheet
        visible={addFoodMealType !== null}
        mealType={addFoodMealType ?? 'breakfast'}
        date={selectedYMD}
        userId={user?.id ?? ''}
        onClose={() => setAddFoodMealType(null)}
        onSaved={() => { setAddFoodMealType(null); refetchDiet(); }}
      />

      {/* Food options sheet — always mounted, shown when a ··· is tapped */}
      <FoodOptionsSheet
        entry={optionsEntry}
        visible={optionsEntry !== null}
        onClose={() => setOptionsEntry(null)}
        onEdit={() => {
          const entry = optionsEntry;
          setOptionsEntry(null);
          setTimeout(() => setEditingEntry(entry), 300);
        }}
        onDelete={() => {
          const entry = optionsEntry;
          setOptionsEntry(null);
          setTimeout(() => {
            Alert.alert(
              'Delete Meal',
              `Delete "${entry?.description || 'this meal'}"? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    if (!entry || !user) return;
                    await supabase.from('diet_logs').delete().eq('id', entry.id).eq('user_id', user.id);
                    refetchDiet();
                    recalculateScores().catch(console.error);
                  },
                },
              ],
            );
          }, 350);
        }}
      />

      {/* Edit food sheet — always mounted, shown when editing an entry */}
      <EditFoodSheet
        entry={editingEntry}
        visible={editingEntry !== null}
        userId={user?.id ?? ''}
        onClose={() => setEditingEntry(null)}
        onSaved={() => { setEditingEntry(null); refetchDiet(); }}
      />

      {/* Log sleep sheet */}
      <LogSleepSheet
        visible={logSleepOpen}
        date={selectedYMD}
        userId={user?.id ?? ''}
        onClose={() => setLogSleepOpen(false)}
        onSaved={() => setLogSleepOpen(false)}
      />

      {/* Calendar picker */}
      <CalendarModal
        visible={calendarOpen}
        selectedDate={selectedDate}
        markers={markers}
        todayYMD={todayYMD}
        onSelectDate={(d) => setSelectedDate(d)}
        onClose={() => setCalendarOpen(false)}
      />
    </SafeAreaView>
  );
}

// ── WorkoutSegment ─────────────────────────────────────────────────────────
type WorkoutItem = ReturnType<typeof useWorkoutHistory>['items'][number];

function WorkoutSegment({
  workouts,
  loading,
  weekSummary,
  selectedYMD,
  todayYMD,
}: {
  workouts: WorkoutItem[];
  loading: boolean;
  weekSummary: { count: number; streak: number };
  selectedYMD: string;
  todayYMD: string;
}) {
  const router = useRouter();
  const isEmpty = !loading && workouts.length === 0;
  const isToday = selectedYMD === todayYMD;

  return (
    <View style={styles.segmentBody}>
      {/* Weekly context strip */}
      <View style={styles.weekContext}>
        <Text style={styles.weekContextText}>
          This week: {weekSummary.count} workout{weekSummary.count !== 1 ? 's' : ''}
          {weekSummary.streak > 0 ? `  ·  ${weekSummary.streak}-day streak` : ''}
        </Text>
      </View>

      {isEmpty ? (
        <Card padding="comfortable" style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Dumbbell size={32} color={colors.ink4} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
          <Text style={styles.emptyCaption}>
            {isToday ? 'Start a routine or log a freestyle workout to begin.' : 'No workouts on this day.'}
          </Text>
          {isToday && (
            <View style={styles.emptyActions}>
              <Button label="Start a Routine" fullWidth onPress={() => router.push('/(tabs)/routines')} />
              <Button label="Log freestyle workout" variant="secondary" fullWidth onPress={() => router.push('/(modals)/active-workout?mode=freestyle')} />
            </View>
          )}
        </Card>
      ) : (
        <>
          {/* Stats card */}
          <Card padding="compact">
            <View style={styles.statsRow}>
              <StatPill label="Exercises" value={String(workouts.reduce((s, w) => s + w.total_exercises, 0))} />
              <StatPill label="Volume" value={`${workouts.reduce((s, w) => s + w.total_volume_kg, 0).toFixed(0)} kg`} />
              <StatPill label="Sets" value={String(workouts.reduce((s, w) => s + w.total_sets, 0))} />
            </View>
          </Card>
          {/* Session cards */}
          {workouts.map((w) => (
            <Card key={w.id} padding="default">
              <Text style={styles.sessionTitle}>{w.workout_type}</Text>
              <Text style={styles.sessionMeta}>
                {w.duration_minutes ? `${w.duration_minutes} min  ·  ` : ''}
                {w.workout_exercises.slice(0, 3).map((e) => e.exercise_name).join(', ')}
                {w.workout_exercises.length > 3 ? ` +${w.workout_exercises.length - 3} more` : ''}
              </Text>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}

// ── DietSegment ────────────────────────────────────────────────────────────
type DietTotals = { calories: number; protein: number; carbs: number; fats: number };
type DietByMeal = Record<string, ReturnType<typeof useDietLogs>['items']>;

function DietSegment({
  selectedDate,
  selectedYMD,
  todayYMD,
  onShiftDate,
  totals,
  byMeal,
  loading,
  onAddFood,
  onItemOptions,
  calorieTarget,
}: {
  selectedDate: Date;
  selectedYMD: string;
  todayYMD: string;
  onShiftDate: (delta: number) => void;
  totals: DietTotals;
  byMeal: DietByMeal;
  loading: boolean;
  onAddFood: (mealType: string) => void;
  onItemOptions: (entry: DietLog) => void;
  calorieTarget: number;
}) {
  const ringOffset = CAL_CIRC * (1 - Math.min(totals.calories / calorieTarget, 1));
  const calPct = Math.round((totals.calories / calorieTarget) * 100);

  return (
    <View style={styles.segmentBody}>
      {/* Date navigation */}
      <View style={styles.dateNav}>
        <Pressable onPress={() => onShiftDate(-1)} style={styles.dateNavBtn}>
          <ChevronLeft size={20} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.dateNavLabel}>{formatMedDate(selectedYMD)}</Text>
        <Pressable
          onPress={() => onShiftDate(1)}
          disabled={selectedYMD >= todayYMD}
          style={[styles.dateNavBtn, selectedYMD >= todayYMD && styles.dateNavDisabled]}
        >
          <ChevronRight size={20} color={selectedYMD >= todayYMD ? colors.ink4 : colors.ink2} strokeWidth={1.75} />
        </Pressable>
      </View>

      {/* Calorie ring */}
      <Card padding="comfortable">
        <View style={styles.calRow}>
          <View style={styles.ringWrap}>
            <Svg width={CAL_SIZE} height={CAL_SIZE}>
              <Circle cx={CAL_SIZE / 2} cy={CAL_SIZE / 2} r={CAL_R}
                stroke={colors.surfaceSunk} strokeWidth={CAL_STROKE} fill="none" />
              <Circle cx={CAL_SIZE / 2} cy={CAL_SIZE / 2} r={CAL_R}
                stroke={colors.accent} strokeWidth={CAL_STROKE} fill="none"
                strokeDasharray={CAL_CIRC} strokeDashoffset={ringOffset}
                strokeLinecap="round" rotation="-90"
                origin={`${CAL_SIZE / 2}, ${CAL_SIZE / 2}`} />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={[styles.calNum, numericStyle]}>{Math.round(totals.calories)}</Text>
              <Text style={styles.calTarget}>/ {calorieTarget} kcal</Text>
            </View>
          </View>
          <View style={styles.macroList}>
            <MacroPill label="Protein" value={Math.round(totals.protein)} unit="g" color={colors.accent} />
            <MacroPill label="Carbs"   value={Math.round(totals.carbs)}   unit="g" color={colors.ink3} />
            <MacroPill label="Fat"     value={Math.round(totals.fats)}    unit="g" color={colors.success} />
          </View>
        </View>
      </Card>

      {/* Meal cards */}
      {MEAL_SECTIONS.map((section) => {
        const entries = byMeal[section.id] ?? [];
        const sectionCals = entries.reduce((s, e) => s + (e.calories || 0), 0);
        return (
          <Card key={section.id} padding="default">
            <View style={styles.mealHeader}>
              <Text style={styles.mealTitle}>{section.label}</Text>
              {sectionCals > 0 && (
                <Text style={[styles.mealCals, numericStyle]}>{Math.round(sectionCals)} kcal</Text>
              )}
            </View>
            {entries.map((e) => (
              <View key={e.id} style={styles.foodRow}>
                <View style={styles.foodRowContent}>
                  <View style={styles.foodRowInfo}>
                    {e.description ? (
                      <Text style={styles.foodDesc} numberOfLines={2}>{e.description}</Text>
                    ) : null}
                    <Text style={styles.foodMacros} numberOfLines={1}>
                      {Math.round(e.calories)} kcal · P {Math.round(e.protein_g)}g · C {Math.round(e.carbs_g)}g · F {Math.round(e.fats_g)}g
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => onItemOptions(e)}
                    hitSlop={10}
                    style={styles.foodRowMore}
                    accessibilityLabel="More options"
                  >
                    <MoreHorizontal size={16} color={colors.ink4} strokeWidth={1.75} />
                  </Pressable>
                </View>
              </View>
            ))}
            <Pressable style={styles.addFoodRow} onPress={() => onAddFood(section.id)}>
              <Plus size={14} color={colors.accent} strokeWidth={1.75} />
              <Text style={styles.addFoodLabel}>Add {section.label.toLowerCase()}</Text>
            </Pressable>
          </Card>
        );
      })}
    </View>
  );
}

// ── SleepSegment ───────────────────────────────────────────────────────────
type SleepItem = ReturnType<typeof useSleepLogs>['items'][number];

function SleepSegment({
  lastNight,
  sevenDay,
  recent,
  loading,
  onLogSleep,
}: {
  lastNight: SleepItem | null;
  sevenDay: SleepItem[];
  recent: SleepItem[];
  loading: boolean;
  onLogSleep: () => void;
}) {
  const QUALITY_FILLED: Record<string, number> = { poor: 1, okay: 3, good: 5 };
  const QUALITY_COLOR: Record<string, string> = { poor: colors.alert, okay: colors.ink3, good: colors.success };
  const maxHours = Math.max(...sevenDay.map((s) => s.hours), 10);

  return (
    <View style={styles.segmentBody}>
      {/* Last night */}
      {lastNight ? (
        <Card padding="comfortable">
          <Text style={styles.sectionLabel}>LAST NIGHT</Text>
          <Text style={[styles.sleepHours, numericStyle]}>{lastNight.hours}h</Text>
          {lastNight.quality && (
            <View style={styles.qualityBar}>
              {[1, 2, 3, 4, 5].map((seg) => (
                <View
                  key={seg}
                  style={[
                    styles.qualitySeg,
                    seg <= (QUALITY_FILLED[lastNight.quality!] ?? 0)
                      ? { backgroundColor: QUALITY_COLOR[lastNight.quality!] ?? colors.ink4 }
                      : { backgroundColor: colors.surfaceSunk },
                  ]}
                />
              ))}
            </View>
          )}
          <Text style={styles.qualityLabel}>{lastNight.quality ?? '—'}</Text>
        </Card>
      ) : (
        <Card padding="comfortable" style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Moon size={32} color={colors.ink4} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No sleep logged yet</Text>
          <Text style={styles.emptyCaption}>Log tonight's sleep to track your recovery.</Text>
          <Button label="Log Sleep" fullWidth onPress={onLogSleep} style={{ marginTop: spacing.md }} />
        </Card>
      )}

      {/* 7-day overview */}
      {sevenDay.length > 0 && (
        <Card padding="default">
          <Text style={styles.sectionLabel}>7-DAY OVERVIEW</Text>
          <View style={styles.barChart}>
            {sevenDay.map((s) => {
              const pct = maxHours > 0 ? s.hours / maxHours : 0;
              const label = new Date(s.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
              return (
                <View key={s.date} style={styles.barCol}>
                  <Text style={[styles.barValue, numericStyle]}>{s.hours}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${Math.round(pct * 100)}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{label}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {/* Recent nights */}
      {recent.length > 0 && (
        <Card padding="default">
          <Text style={styles.sectionLabel}>RECENT NIGHTS</Text>
          <View style={{ gap: spacing.sm }}>
            {recent.map((s) => (
              <View key={s.id} style={styles.recentRow}>
                <Text style={styles.recentDate}>{formatMedDate(s.date)}</Text>
                <Text style={[styles.recentHours, numericStyle]}>{s.hours}h</Text>
                <Text style={styles.recentQuality}>{s.quality ?? '—'}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {lastNight && (
        <Button label="Log Sleep" variant="secondary" fullWidth onPress={onLogSleep} />
      )}
    </View>
  );
}

// ── AddFoodSheet ───────────────────────────────────────────────────────────
type AddFoodMode = 'search' | 'detail' | 'manual';

function AddFoodSheet({
  visible,
  mealType,
  date,
  userId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  mealType: string;
  date: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<AddFoodMode>('search');
  const [selectedFood, setSelectedFood] = useState<FatSecretFood | null>(null);

  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  const headerTitle =
    mode === 'detail' && selectedFood
      ? selectedFood.food_name
      : mode === 'manual'
      ? 'Enter manually'
      : `Add to ${mealLabel}`;

  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={['82%']}>
      <View style={styles.sheetHeader}>
        {mode !== 'search' ? (
          <Pressable onPress={() => setMode('search')} style={styles.sheetBackBtn}>
            <ChevronLeft size={20} color={colors.ink2} strokeWidth={1.75} />
          </Pressable>
        ) : (
          <View style={styles.sheetBackBtn} />
        )}
        <Text style={styles.sheetTitle} numberOfLines={1}>{headerTitle}</Text>
        <Pressable onPress={onClose} style={styles.sheetBackBtn}>
          <X size={20} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
      </View>

      {mode === 'search' && (
        <SearchFoodView
          onSelect={(food) => { setSelectedFood(food); setMode('detail'); }}
          onManual={() => setMode('manual')}
        />
      )}
      {mode === 'detail' && selectedFood && (
        <FoodDetailView
          food={selectedFood}
          mealType={mealType}
          mealLabel={mealLabel}
          date={date}
          userId={userId}
          onSaved={onSaved}
        />
      )}
      {mode === 'manual' && (
        <ManualFoodView
          mealType={mealType}
          mealLabel={mealLabel}
          date={date}
          userId={userId}
          onSaved={onSaved}
        />
      )}
    </Sheet>
  );
}

// ── SearchFoodView ─────────────────────────────────────────────────────────
function SearchFoodView({
  onSelect,
  onManual,
}: {
  onSelect: (food: FatSecretFood) => void;
  onManual: () => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<FatSecretFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce keystrokes → 300ms
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchFoods(debounced)
      .then((r) => {
        console.log('[FatSecret] results:', r.foods.length, r.foods[0]?.food_name);
        if (!cancelled) setResults(r.foods);
      })
      .catch((e) => {
        console.log('[FatSecret] error:', e.message);
        if (!cancelled) setError(e.message ?? 'Search failed');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  return (
    <View style={styles.searchBody}>
      <View style={styles.searchBar}>
        <Search size={18} color={colors.ink3} strokeWidth={1.75} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods…"
          placeholderTextColor={colors.ink3}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={16} color={colors.ink3} strokeWidth={1.75} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.searchResults}
        contentContainerStyle={styles.searchResultsInner}
        keyboardShouldPersistTaps="handled"
      >
        {loading && (
          <View style={styles.searchStateRow}>
            <ActivityIndicator size="small" color={colors.ink3} />
          </View>
        )}
        {error && (
          <Text style={styles.sheetError}>{error}</Text>
        )}
        {!loading && !error && debounced.length >= 2 && results.length === 0 && (
          <Text style={styles.searchEmpty}>No results for "{debounced}"</Text>
        )}
        {!loading && results.map((food) => (
          <Pressable
            key={food.food_id}
            style={styles.foodResultRow}
            onPress={() => onSelect(food)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.foodResultName} numberOfLines={1}>
                {food.food_name}
                {food.brand_name ? ` · ${food.brand_name}` : ''}
              </Text>
              {food.food_description ? (
                <Text style={styles.foodResultDesc} numberOfLines={1}>{food.food_description}</Text>
              ) : null}
            </View>
            <ChevronRight size={16} color={colors.ink4} strokeWidth={1.75} />
          </Pressable>
        ))}
        <Pressable style={styles.manualEntryLink} onPress={onManual}>
          <Plus size={14} color={colors.accent} strokeWidth={1.75} />
          <Text style={styles.manualEntryLabel}>Can't find it? Enter manually</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ── FoodDetailView ─────────────────────────────────────────────────────────
function FoodDetailView({
  food,
  mealType,
  mealLabel,
  date,
  userId,
  onSaved,
}: {
  food: FatSecretFood;
  mealType: string;
  mealLabel: string;
  date: string;
  userId: string;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<FatSecretFoodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [weight, setWeight] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getFoodDetail(food.food_id)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        const ref = pickReferenceServing(d.servings);
        if (ref) setWeight(String(Math.round(ref.metric_serving_amount)));
      })
      .catch((e) => { if (!cancelled) setLoadError(e.message ?? 'Failed to load food'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [food.food_id]);

  const reference = useMemo(() => detail ? pickReferenceServing(detail.servings) : null, [detail]);

  const weightNum = useMemo(() => {
    const n = parseFloat(weight);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [weight]);

  const nutrition = useMemo(() => {
    if (!reference || reference.metric_serving_amount <= 0 || weightNum <= 0) {
      return { calories: 0, protein: 0, carbs: 0, fats: 0 };
    }
    const ratio = weightNum / reference.metric_serving_amount;
    return {
      calories: reference.calories * ratio,
      protein:  reference.protein  * ratio,
      carbs:    reference.carbohydrate * ratio,
      fats:     reference.fat * ratio,
    };
  }, [reference, weightNum]);

  const unit = reference?.metric_serving_unit ?? 'g';

  const handleSave = async () => {
    if (!userId || !reference || weightNum <= 0) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await saveDietLog({
      userId,
      date,
      mealType,
      description: `${food.food_name} (${Math.round(weightNum)}${unit})`,
      calories: Math.round(nutrition.calories),
      protein:  Math.round(nutrition.protein  * 10) / 10,
      carbs:    Math.round(nutrition.carbs    * 10) / 10,
      fats:     Math.round(nutrition.fats     * 10) / 10,
    });
    setSaving(false);
    if (error) { setSaveError(error); return; }
    recalculateScores().catch(console.error);
    onSaved();
  };

  if (loading) {
    return (
      <View style={styles.detailLoading}>
        <ActivityIndicator size="small" color={colors.ink3} />
      </View>
    );
  }
  if (loadError || !detail || !reference) {
    return (
      <View style={styles.sheetBody}>
        <Text style={styles.sheetError}>{loadError ?? 'No nutrition data available for this food.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
      {/* Weight selector */}
      <View>
        <Text style={styles.sheetFieldLabel}>Weight ({unit})</Text>
        <View style={styles.weightRow}>
          <TextInput
            value={weight}
            onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            style={styles.weightInput}
            selectTextOnFocus
          />
          <View style={styles.weightChipsRow}>
            {[50, 100, 150, 200].map((g) => (
              <Pressable
                key={g}
                style={[styles.weightChip, weight === String(g) && styles.weightChipActive]}
                onPress={() => setWeight(String(g))}
              >
                <Text style={[styles.weightChipLabel, weight === String(g) && styles.weightChipLabelActive]}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={styles.detailHint}>
          Reference: {reference.serving_description || `${reference.metric_serving_amount}${unit}`}
        </Text>
      </View>

      {/* Live nutrition */}
      <View style={styles.nutritionBox}>
        <View style={styles.nutritionMain}>
          <Text style={[styles.nutritionCals, numericStyle]}>{Math.round(nutrition.calories)}</Text>
          <Text style={styles.nutritionCalsUnit}>kcal</Text>
        </View>
        <View style={styles.nutritionMacros}>
          <NutritionStat label="Protein" value={nutrition.protein} />
          <NutritionStat label="Carbs"   value={nutrition.carbs} />
          <NutritionStat label="Fat"     value={nutrition.fats} />
        </View>
      </View>

      {saveError ? <Text style={styles.sheetError}>{saveError}</Text> : null}
      <Button
        label={saving ? 'Saving…' : `Add to ${mealLabel}`}
        fullWidth
        disabled={saving || weightNum <= 0}
        onPress={handleSave}
      />
    </ScrollView>
  );
}

function NutritionStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.nutritionStat}>
      <Text style={[styles.nutritionStatValue, numericStyle]}>{value.toFixed(1)}g</Text>
      <Text style={styles.nutritionStatLabel}>{label}</Text>
    </View>
  );
}

// ── ManualFoodView (fallback) ──────────────────────────────────────────────
function ManualFoodView({
  mealType,
  mealLabel,
  date,
  userId,
  onSaved,
}: {
  mealType: string;
  mealLabel: string;
  date: string;
  userId: string;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await saveDietLog({
      userId,
      date,
      mealType,
      description,
      calories: Number(calories) || 0,
      protein:  Number(protein)  || 0,
      carbs:    Number(carbs)    || 0,
      fats:     Number(fats)     || 0,
    });
    setSaving(false);
    if (saveError) { setError(saveError); return; }
    recalculateScores().catch(console.error);
    onSaved();
  };

  return (
    <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
      <Input label="Description (optional)" value={description} onChangeText={setDescription} autoCapitalize="sentences" />
      <Input label="Calories (kcal)" value={calories} onChangeText={setCalories} keyboardType="decimal-pad" />
      <View style={styles.macroRow}>
        <View style={{ flex: 1 }}>
          <Input label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Fat (g)" value={fats} onChangeText={setFats} keyboardType="decimal-pad" />
        </View>
      </View>
      {error ? <Text style={styles.sheetError}>{error}</Text> : null}
      <Button label={saving ? 'Saving…' : `Add to ${mealLabel}`} fullWidth disabled={saving} onPress={handleSave} />
    </ScrollView>
  );
}

// ── FoodOptionsSheet ──────────────────────────────────────────────────────

function FoodOptionsSheet({
  entry,
  visible,
  onClose,
  onEdit,
  onDelete,
}: {
  entry: DietLog | null;
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.optSheetHead}>
        <Text style={styles.optSheetTitle} numberOfLines={2}>
          {entry?.description || 'Meal entry'}
        </Text>
        {entry ? (
          <Text style={styles.optSheetSub}>
            {Math.round(entry.calories)} kcal
          </Text>
        ) : null}
      </View>
      <View style={styles.optSheetDivider} />
      <Pressable style={styles.optSheetRow} onPress={onEdit}>
        <Pencil size={19} color={colors.ink2} strokeWidth={1.75} />
        <Text style={styles.optSheetLabel}>Edit Meal</Text>
      </Pressable>
      <View style={styles.optSheetDivider} />
      <Pressable style={styles.optSheetRow} onPress={onDelete}>
        <Trash2 size={19} color={colors.alert} strokeWidth={1.75} />
        <Text style={styles.optSheetDestructive}>Delete Meal</Text>
      </Pressable>
      <View style={[styles.optSheetCancel, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Button label="Cancel" variant="secondary" fullWidth onPress={onClose} />
      </View>
    </Sheet>
  );
}

// ── EditFoodSheet ──────────────────────────────────────────────────────────

function EditFoodSheet({
  entry,
  visible,
  userId,
  onClose,
  onSaved,
}: {
  entry: DietLog | null;
  visible: boolean;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-initialise form whenever we switch to a different entry.
  useEffect(() => {
    if (!entry) return;
    setDescription(entry.description ?? '');
    setCalories(String(Math.round(entry.calories)));
    setProtein(String(entry.protein_g));
    setCarbs(String(entry.carbs_g));
    setFats(String(entry.fats_g));
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id]);

  const handleSave = async () => {
    if (!entry || !userId) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await saveDietLog({
      userId,
      date: '',           // unused for edits
      mealType: entry.meal_type ?? 'snack',
      description,
      calories: Number(calories) || 0,
      protein:  Number(protein)  || 0,
      carbs:    Number(carbs)    || 0,
      fats:     Number(fats)     || 0,
      editingId: entry.id,
    });
    setSaving(false);
    if (saveError) { setError(saveError); return; }
    recalculateScores().catch(console.error);
    onSaved();
  };

  return (
    <Sheet visible={visible} onClose={onClose} snapPoints={['75%']}>
      <View style={styles.sheetHeader}>
        <View style={styles.sheetBackBtn} />
        <Text style={styles.sheetTitle}>Edit Meal</Text>
        <Pressable onPress={onClose} style={styles.sheetBackBtn}>
          <X size={20} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.sheetBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          autoCapitalize="sentences"
        />
        <Input
          label="Calories (kcal)"
          value={calories}
          onChangeText={setCalories}
          keyboardType="decimal-pad"
        />
        <View style={styles.macroRow}>
          <View style={{ flex: 1 }}>
            <Input label="Protein (g)" value={protein} onChangeText={setProtein} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Carbs (g)" value={carbs} onChangeText={setCarbs} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Fat (g)" value={fats} onChangeText={setFats} keyboardType="decimal-pad" />
          </View>
        </View>
        {error ? <Text style={styles.sheetError}>{error}</Text> : null}
        <Button
          label={saving ? 'Saving…' : 'Save Changes'}
          fullWidth
          disabled={saving}
          onPress={handleSave}
        />
      </ScrollView>
    </Sheet>
  );
}

// ── LogSleepSheet ──────────────────────────────────────────────────────────
function LogSleepSheet({
  visible,
  date,
  userId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  date: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [hours, setHours] = useState(7);
  const [quality, setQuality] = useState<SleepQuality>('good');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await saveSleepLog({ userId, date, hours, quality });
    setSaving(false);
    if (saveError) { setError(saveError); return; }
    recalculateScores().catch(console.error);
    onSaved();
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Log Sleep</Text>
        <Pressable onPress={onClose}>
          <X size={20} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
      </View>
      <View style={styles.sheetBody}>
        <Text style={[styles.sleepHoursLarge, numericStyle]}>{hours.toFixed(1)}h</Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0}
          maximumValue={12}
          step={0.5}
          value={hours}
          onValueChange={setHours}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.surfaceSunk}
          thumbTintColor={colors.accent}
        />
        <Text style={styles.sheetFieldLabel}>Quality</Text>
        <View style={styles.qualityChips}>
          {QUALITY_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={quality === opt.value}
              onPress={() => setQuality(opt.value)}
            />
          ))}
        </View>
        {error ? <Text style={styles.sheetError}>{error}</Text> : null}
        <Button label={saving ? 'Saving…' : 'Save Sleep'} fullWidth disabled={saving} onPress={handleSave} style={{ marginTop: spacing.md }} />
      </View>
    </Sheet>
  );
}

// ── CalendarModal ──────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DOW_LABELS = ['S','M','T','W','T','F','S'];
const CAL_DOT_COLORS: Record<'workout' | 'diet' | 'sleep', string> = {
  workout: colors.accent,
  diet: colors.success,
  sleep: '#7B8FD4',
};

function CalendarModal({
  visible,
  selectedDate,
  markers,
  todayYMD,
  onSelectDate,
  onClose,
}: {
  visible: boolean;
  selectedDate: Date;
  markers: Record<string, Array<'workout' | 'diet' | 'sleep'>>;
  todayYMD: string;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate.getMonth());

  useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [visible, selectedDate]);

  const selectedYMD = toIso(selectedDate);
  const todayDate = new Date();
  const isCurrentMonth =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth();

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const rawCells: Array<Date | null> = [];
  for (let i = 0; i < firstDow; i++) rawCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) rawCells.push(new Date(viewYear, viewMonth, d));

  const rows: Array<Array<Date | null>> = [];
  for (let i = 0; i < rawCells.length; i += 7) {
    const row = rawCells.slice(i, i + 7);
    while (row.length < 7) row.push(null);
    rows.push(row);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.calOverlay} onPress={onClose}>
        <Pressable style={styles.calBox} onPress={(e) => e.stopPropagation()}>
          {/* Month navigation */}
          <View style={styles.calHeader}>
            <Pressable onPress={prevMonth} style={styles.calNavBtn}>
              <ChevronLeft size={20} color={colors.ink2} strokeWidth={1.75} />
            </Pressable>
            <Text style={styles.calMonthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <Pressable
              onPress={nextMonth}
              style={[styles.calNavBtn, isCurrentMonth && styles.calNavDisabled]}
            >
              <ChevronRight
                size={20}
                color={isCurrentMonth ? colors.ink4 : colors.ink2}
                strokeWidth={1.75}
              />
            </Pressable>
          </View>

          {/* Day-of-week header */}
          <View style={styles.calDowRow}>
            {DOW_LABELS.map((label, i) => (
              <Text key={i} style={styles.calDowLabel}>{label}</Text>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.calGrid}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.calGridRow}>
                {row.map((date, ci) => {
                  if (!date) return <View key={`e-${ci}`} style={styles.calCell} />;
                  const ymd = toIso(date);
                  const isSelected = ymd === selectedYMD;
                  const isToday = ymd === todayYMD;
                  const isFuture = ymd > todayYMD;
                  const dotTypes = markers[ymd] ?? [];
                  return (
                    <Pressable
                      key={ymd}
                      style={[
                        styles.calCell,
                        isSelected && styles.calCellSelected,
                        isToday && !isSelected && styles.calCellToday,
                      ]}
                      onPress={() => { if (!isFuture) { onSelectDate(date); onClose(); } }}
                      disabled={isFuture}
                    >
                      <Text style={[
                        styles.calDayNum,
                        isSelected && styles.calDaySelected,
                        isToday && !isSelected && styles.calDayToday,
                        isFuture && styles.calDayFuture,
                      ]}>
                        {date.getDate()}
                      </Text>
                      {dotTypes.length > 0 && (
                        <View style={styles.calDotRow}>
                          {dotTypes.slice(0, 3).map((t, j) => (
                            <View
                              key={j}
                              style={[styles.calDot, {
                                backgroundColor: isSelected ? colors.surface : CAL_DOT_COLORS[t],
                              }]}
                            />
                          ))}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Today shortcut */}
          <Pressable style={styles.calTodayBtn} onPress={() => { onSelectDate(new Date()); onClose(); }}>
            <Text style={styles.calTodayLabel}>Go to Today</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Small helper components ────────────────────────────────────────────────
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statValue, numericStyle]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroPill}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={[styles.macroValue, numericStyle]}>{value}{unit}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'], paddingTop: spacing.md, paddingBottom: spacing.sm,
  } satisfies ViewStyle,
  segmentWrap: { paddingHorizontal: spacing['2xl'], marginBottom: spacing.sm } satisfies ViewStyle,
  weekStripOuter: { marginBottom: spacing.sm } satisfies ViewStyle,
  content: { flex: 1 } satisfies ViewStyle,
  contentInner: { paddingHorizontal: spacing['2xl'], gap: spacing.md } satisfies ViewStyle,
  segmentBody: { gap: spacing.md } satisfies ViewStyle,

  // Workout
  weekContext: { paddingVertical: spacing.xs } satisfies ViewStyle,
  weekContextText: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' } satisfies ViewStyle,
  statPill: { alignItems: 'center', gap: 2 } satisfies ViewStyle,
  statValue: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  statLabel: { ...(typography.label as TextStyle) } satisfies TextStyle,
  sessionTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  sessionMeta: { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 2 } satisfies TextStyle,

  // Empty states
  emptyCard: { alignItems: 'center' } satisfies ViewStyle,
  emptyIcon: {
    width: 64, height: 64, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  } satisfies ViewStyle,
  emptyTitle: { ...(typography.subheading as TextStyle), marginBottom: spacing.xs } satisfies TextStyle,
  emptyCaption: { ...(typography.caption as TextStyle), color: colors.ink3, textAlign: 'center', marginBottom: spacing.lg } satisfies TextStyle,
  emptyActions: { width: '100%', gap: spacing.sm } satisfies ViewStyle,

  // Diet
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.pill, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  } satisfies ViewStyle,
  dateNavBtn: { padding: spacing.sm } satisfies ViewStyle,
  dateNavDisabled: { opacity: 0.3 } satisfies ViewStyle,
  dateNavLabel: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  calRow: { flexDirection: 'row', alignItems: 'center', gap: spacing['2xl'] } satisfies ViewStyle,
  ringWrap: { width: CAL_SIZE, height: CAL_SIZE, position: 'relative', flexShrink: 0 } satisfies ViewStyle,
  ringCenter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' } satisfies ViewStyle,
  calNum: { ...(typography.display as TextStyle), fontSize: 24 } satisfies TextStyle,
  calTarget: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  macroList: { flex: 1, gap: spacing.md } satisfies ViewStyle,
  macroPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } satisfies ViewStyle,
  macroDot: { width: 8, height: 8, borderRadius: radius.pill } satisfies ViewStyle,
  macroLabel: { ...(typography.caption as TextStyle), flex: 1 } satisfies TextStyle,
  macroValue: { ...(typography.bodyMedium as TextStyle), fontSize: 13 } satisfies TextStyle,
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm } satisfies ViewStyle,
  mealTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  mealCals: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  foodRow: { paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.divider } satisfies ViewStyle,
  foodRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } satisfies ViewStyle,
  foodRowInfo: { flex: 1, gap: 2 } satisfies ViewStyle,
  foodRowMore: { flexShrink: 0, paddingVertical: spacing.xs } satisfies ViewStyle,
  foodDesc: { ...(typography.bodyMedium as TextStyle), fontSize: 14 } satisfies TextStyle,
  foodMacros: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,

  // Food options sheet
  optSheetHead: { paddingHorizontal: spacing['2xl'], marginBottom: spacing.md } satisfies ViewStyle,
  optSheetTitle: { ...(typography.subheading as TextStyle), marginBottom: spacing.xs } satisfies TextStyle,
  optSheetSub: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  optSheetDivider: { height: 1, backgroundColor: colors.surfaceElevBorder } satisfies ViewStyle,
  optSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  } satisfies ViewStyle,
  optSheetLabel: { ...(typography.body as TextStyle), color: colors.ink1 } satisfies TextStyle,
  optSheetDestructive: { ...(typography.body as TextStyle), color: colors.alert } satisfies TextStyle,
  optSheetCancel: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  } satisfies ViewStyle,
  addFoodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.md } satisfies ViewStyle,
  addFoodLabel: { ...(typography.bodyMedium as TextStyle), color: colors.accent, fontSize: 14 } satisfies TextStyle,

  // Sleep
  sectionLabel: { ...(typography.label as TextStyle), marginBottom: spacing.md } satisfies TextStyle,
  sleepHours: { ...(typography.displayXl as TextStyle), marginBottom: spacing.sm } satisfies TextStyle,
  sleepHoursLarge: { ...(typography.displayXl as TextStyle), textAlign: 'center', marginBottom: spacing.md } satisfies TextStyle,
  qualityBar: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs } satisfies ViewStyle,
  qualitySeg: { flex: 1, height: 6, borderRadius: radius.pill } satisfies ViewStyle,
  qualityLabel: { ...(typography.caption as TextStyle), color: colors.ink3, textTransform: 'capitalize' } satisfies TextStyle,
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: spacing.sm } satisfies ViewStyle,
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' } satisfies ViewStyle,
  barValue: { ...(typography.label as TextStyle), fontSize: 10 } satisfies TextStyle,
  barTrack: { width: '80%', flex: 1, backgroundColor: colors.surfaceSunk, borderRadius: radius.pill, overflow: 'hidden', justifyContent: 'flex-end' } satisfies ViewStyle,
  barFill: { width: '100%', backgroundColor: colors.accent, borderRadius: radius.pill } satisfies ViewStyle,
  barLabel: { ...(typography.label as TextStyle), fontSize: 10 } satisfies TextStyle,
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.divider } satisfies ViewStyle,
  recentDate: { ...(typography.body as TextStyle), flex: 1 } satisfies TextStyle,
  recentHours: { ...(typography.bodyMedium as TextStyle), marginRight: spacing.md } satisfies TextStyle,
  recentQuality: { ...(typography.caption as TextStyle), color: colors.ink3, width: 48, textAlign: 'right', textTransform: 'capitalize' } satisfies TextStyle,

  // Sheet
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'], paddingVertical: spacing.md,
  } satisfies ViewStyle,
  sheetTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  sheetBody: { paddingHorizontal: spacing['2xl'], gap: spacing.md, paddingBottom: spacing.xl } satisfies ViewStyle,
  sheetError: { ...(typography.caption as TextStyle), color: colors.alert } satisfies TextStyle,
  sheetFieldLabel: { ...(typography.label as TextStyle), marginTop: spacing.xs } satisfies TextStyle,
  qualityChips: { flexDirection: 'row', gap: spacing.sm } satisfies ViewStyle,
  macroRow: { flexDirection: 'row', gap: spacing.sm } satisfies ViewStyle,

  // Header calendar button
  calIconBtn: { padding: spacing.xs } satisfies ViewStyle,

  sheetBackBtn: { width: 28, alignItems: 'center', justifyContent: 'center' } satisfies ViewStyle,

  // Search view
  searchBody: { flex: 1, paddingHorizontal: spacing['2xl'], paddingBottom: spacing.md, gap: spacing.md } satisfies ViewStyle,
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceSunk, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  } satisfies ViewStyle,
  searchInput: {
    flex: 1, ...(typography.body as TextStyle),
    color: colors.ink1, padding: 0,
  } satisfies TextStyle,
  searchResults: { flex: 1 } satisfies ViewStyle,
  searchResultsInner: { paddingBottom: spacing.xl, gap: spacing.xs } satisfies ViewStyle,
  searchStateRow: { paddingVertical: spacing.lg, alignItems: 'center' } satisfies ViewStyle,
  searchEmpty: {
    ...(typography.caption as TextStyle), color: colors.ink3,
    textAlign: 'center', paddingVertical: spacing.lg,
  } satisfies TextStyle,
  foodResultRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  } satisfies ViewStyle,
  foodResultName: { ...(typography.bodyMedium as TextStyle), fontSize: 14 } satisfies TextStyle,
  foodResultDesc: { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 2 } satisfies TextStyle,
  manualEntryLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingTop: spacing.lg, paddingBottom: spacing.sm, alignSelf: 'center',
  } satisfies ViewStyle,
  manualEntryLabel: { ...(typography.bodyMedium as TextStyle), color: colors.accent, fontSize: 13 } satisfies TextStyle,

  // Food detail view
  detailLoading: { paddingVertical: spacing['3xl'], alignItems: 'center' } satisfies ViewStyle,
  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs } satisfies ViewStyle,
  weightInput: {
    width: 80, height: 44,
    backgroundColor: colors.surfaceSunk, borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    ...(typography.subheading as TextStyle),
    color: colors.ink1, textAlign: 'center',
  } satisfies TextStyle,
  weightChipsRow: { flexDirection: 'row', gap: spacing.xs, flex: 1, flexWrap: 'wrap' } satisfies ViewStyle,
  weightChip: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.pill, backgroundColor: colors.surfaceSunk,
  } satisfies ViewStyle,
  weightChipActive: { backgroundColor: colors.ink1 } satisfies ViewStyle,
  weightChipLabel: { ...(typography.caption as TextStyle), color: colors.ink2 } satisfies TextStyle,
  weightChipLabelActive: { color: colors.surface } satisfies TextStyle,
  detailHint: {
    ...(typography.caption as TextStyle), color: colors.ink3,
    marginTop: spacing.xs,
  } satisfies TextStyle,
  nutritionBox: {
    backgroundColor: colors.surfaceSunk, borderRadius: radius.card,
    padding: spacing.lg, gap: spacing.md,
  } satisfies ViewStyle,
  nutritionMain: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs } satisfies ViewStyle,
  nutritionCals: { ...(typography.displayXl as TextStyle) } satisfies TextStyle,
  nutritionCalsUnit: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  nutritionMacros: { flexDirection: 'row', justifyContent: 'space-between' } satisfies ViewStyle,
  nutritionStat: { alignItems: 'center', gap: 2 } satisfies ViewStyle,
  nutritionStatValue: { ...(typography.bodyMedium as TextStyle), fontSize: 14 } satisfies TextStyle,
  nutritionStatLabel: { ...(typography.label as TextStyle), color: colors.ink3 } satisfies TextStyle,

  // CalendarModal
  calOverlay: {
    flex: 1, backgroundColor: colors.scrim,
    justifyContent: 'center', alignItems: 'center',
    padding: spacing['2xl'],
  } satisfies ViewStyle,
  calBox: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.sheet, padding: spacing['2xl'], gap: spacing.md,
  } satisfies ViewStyle,
  calHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  } satisfies ViewStyle,
  calNavBtn: { padding: spacing.sm } satisfies ViewStyle,
  calNavDisabled: { opacity: 0.25 } satisfies ViewStyle,
  calMonthLabel: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  calDowRow: { flexDirection: 'row', marginBottom: spacing.xs } satisfies ViewStyle,
  calDowLabel: {
    flex: 1, textAlign: 'center',
    ...(typography.label as TextStyle), color: colors.ink3, fontSize: 11,
  } satisfies TextStyle,
  calGrid: { gap: 4 } satisfies ViewStyle,
  calGridRow: { flexDirection: 'row' } satisfies ViewStyle,
  calCell: {
    flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.card, gap: 2,
  } satisfies ViewStyle,
  calCellSelected: { backgroundColor: colors.ink1 } satisfies ViewStyle,
  calCellToday: { backgroundColor: colors.accentSoft } satisfies ViewStyle,
  calDayNum: {
    ...(typography.body as TextStyle), fontSize: 14,
  } satisfies TextStyle,
  calDaySelected: { color: colors.surface, fontWeight: '600' } satisfies TextStyle,
  calDayToday: { color: colors.accent, fontWeight: '600' } satisfies TextStyle,
  calDayFuture: { color: colors.ink4 } satisfies TextStyle,
  calDotRow: { flexDirection: 'row', gap: 2, height: 5, alignItems: 'center' } satisfies ViewStyle,
  calDot: { width: 4, height: 4, borderRadius: radius.pill } satisfies ViewStyle,
  calTodayBtn: {
    alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.pill, backgroundColor: colors.surfaceSunk, marginTop: spacing.xs,
  } satisfies ViewStyle,
  calTodayLabel: { ...(typography.bodyMedium as TextStyle), color: colors.ink2 } satisfies TextStyle,
});
