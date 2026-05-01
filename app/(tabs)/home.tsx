import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Dumbbell,
  Moon,
  Plus,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { useDailyScore } from '../../hooks/useDailyScore';
import { useBodyPartScores } from '../../hooks/useBodyPartScores';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useSleepLogs } from '../../hooks/useSleepLogs';
import { useDietLogs } from '../../hooks/useDietLogs';
import { useRoutines } from '../../hooks/useRoutines';
import { useAuthStore } from '../../stores/authStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { supabase } from '../../lib/supabase';
import { Button, Card, Chip } from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

// ─── Ring constants ────────────────────────────────────────────────────────────
const RING_SIZE = 136;
const RING_STROKE = 11;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function relativeDate(iso: string): string {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const d = iso.slice(0, 10);
  if (d === today)     return 'Today';
  if (d === yesterday) return 'Yesterday';
  const daysAgo = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (daysAgo < 7) return `${daysAgo}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

function scoreColor(v: number | null): string {
  if (v === null) return colors.ink4;
  if (v >= 60) return colors.success;
  if (v >= 35) return colors.accent;
  return colors.alert;
}

function scoreBg(v: number | null): string {
  if (v === null) return colors.surfaceSunk;
  if (v >= 60) return colors.successSoft;
  if (v >= 35) return colors.accentSoft;
  return '#F6DDD9';
}

const QUALITY_LABEL: Record<string, string> = {
  excellent: 'Excellent',
  good:      'Good',
  fair:      'Fair',
  poor:      'Poor',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { reset, setWorkoutType, setStartedAt, upsertExercise } = useWorkoutStore();

  // ── Data
  const { score, loading: scoreLoading } = useDailyScore();
  const bodyParts = useBodyPartScores(score);
  const { items: workouts } = useWorkoutHistory();
  const { items: sleepItems } = useSleepLogs();
  const { items: dietLogs } = useDietLogs();
  const { items: routines } = useRoutines();

  // ── User display name
  const [displayName, setDisplayName] = useState('');
  useEffect(() => {
    if (!user) return;
    supabase.from('users').select('name').eq('id', user.id).single()
      .then(({ data }) => { if (data?.name) setDisplayName(data.name); });
  }, [user]);
  const nameLabel = displayName || user?.email?.split('@')[0] || '';

  // ── Animated ring
  const animOffset = useRef(new Animated.Value(RING_CIRC)).current;
  useEffect(() => {
    if (!scoreLoading && score) {
      Animated.timing(animOffset, {
        toValue: RING_CIRC * (1 - Math.min(score.total_score, 100) / 100),
        duration: 1100,
        delay: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [scoreLoading, score?.total_score]);

  // ── Derived values
  const totalScore = score?.total_score ?? 0;

  const bodyPartRows = [
    { label: 'Push',   value: bodyParts.chest },
    { label: 'Pull',   value: bodyParts.back },
    { label: 'Legs',   value: bodyParts.legs },
    { label: 'Core',   value: Math.round((bodyParts.arms + bodyParts.shoulders) / 2) },
    { label: 'Cardio', value: null as number | null },
  ];

  const lastWorkout = workouts[0] ?? null;

  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const recentSleep = sleepItems.find(
    (s) => s.date === today || s.date === yesterday,
  ) ?? null;

  const totalCal     = useMemo(() => dietLogs.reduce((s, l) => s + (l.calories  ?? 0), 0), [dietLogs]);
  const totalProtein = useMemo(() => dietLogs.reduce((s, l) => s + (l.protein_g ?? 0), 0), [dietLogs]);
  const totalCarbs   = useMemo(() => dietLogs.reduce((s, l) => s + (l.carbs_g   ?? 0), 0), [dietLogs]);
  const totalFat     = useMemo(() => dietLogs.reduce((s, l) => s + (l.fats_g    ?? 0), 0), [dietLogs]);

  const firstRoutine = routines[0] ?? null;

  // ── Start routine handler (mirrors routines.tsx)
  const handleStartRoutine = (routineId: string) => {
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    reset();
    setWorkoutType(routine.name);
    setStartedAt(new Date().toISOString());
    [...routine.user_routine_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((rex, idx) => {
        upsertExercise({
          exerciseId: rex.exercise_id,
          name: rex.exercises?.name ?? 'Exercise',
          primaryMuscle: Array.isArray(rex.exercises?.primary_muscles)
            ? (rex.exercises.primary_muscles as string[]).join(', ')
            : rex.exercises?.primary_muscles ?? null,
          orderIndex: idx,
          sets: Array.from({ length: rex.default_sets }, (_, i) => ({
            setNumber: i + 1,
            weight: 0,
            reps: rex.default_reps,
            completed: false,
            isPR: false,
          })),
        });
      });
    router.push(`/(modals)/active-workout?routineId=${routineId}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
      >

        {/* ── Greeting ───────────────────────────────────── */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingText}>
            {greeting()}{nameLabel ? `, ${nameLabel}` : ''}
          </Text>
          <Text style={styles.dateText}>{fmtDate(new Date())}</Text>
        </View>

        {/* ── Body Score ─────────────────────────────────── */}
        <Card padding="comfortable">
          <Text style={styles.cardLabel}>BODY SCORE</Text>
          <View style={styles.scoreRow}>
            {/* Animated ring */}
            <View style={styles.ringWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                  stroke={colors.surfaceSunk} strokeWidth={RING_STROKE} fill="none"
                />
                <AnimatedCircle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                  stroke={colors.accent} strokeWidth={RING_STROKE} fill="none"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={animOffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={[styles.scoreNum, numericStyle]}>
                  {scoreLoading ? '—' : totalScore}
                </Text>
                <Text style={styles.scoreSub}>/ 100</Text>
              </View>
            </View>

            {/* Body-part bars */}
            <View style={styles.barsCol}>
              {bodyPartRows.map((row) => (
                <BodyPartBar key={row.label} label={row.label} value={row.value} />
              ))}
            </View>
          </View>
        </Card>

        {/* ── Today's sub-scores ─────────────────────────── */}
        <SectionRow label="Today" />
        <View style={styles.subScoreRow}>
          <SubScoreCard
            icon={<Dumbbell size={16} color={scoreColor(score?.workout_score ?? null)} strokeWidth={1.75} />}
            label="Workout"
            value={score?.workout_score ?? null}
          />
          <SubScoreCard
            icon={<Zap size={16} color={scoreColor(score?.diet_score ?? null)} strokeWidth={1.75} />}
            label="Diet"
            value={score?.diet_score ?? null}
          />
          <SubScoreCard
            icon={<Moon size={16} color={scoreColor(score?.sleep_score ?? null)} strokeWidth={1.75} />}
            label="Sleep"
            value={score?.sleep_score ?? null}
          />
        </View>

        {/* ── Quick actions ──────────────────────────────── */}
        <View style={styles.actionsRow}>
          <ActionBtn
            icon={Dumbbell}
            label="Start Workout"
            onPress={() => router.push('/(tabs)/routines')}
          />
          <ActionBtn
            icon={Plus}
            label="Log Food"
            onPress={() => router.push('/(tabs)/logs')}
          />
          <ActionBtn
            icon={Moon}
            label="Log Sleep"
            onPress={() => router.push('/(tabs)/logs')}
          />
        </View>

        {/* ── Up Next ────────────────────────────────────── */}
        <SectionRow
          label="Up Next"
          action={routines.length > 1 ? 'See all' : undefined}
          onAction={() => router.push('/(tabs)/routines')}
        />
        {firstRoutine ? (
          <Card padding="default">
            <View style={styles.upNextHeader}>
              <View style={styles.upNextMeta}>
                <Text style={styles.upNextName} numberOfLines={1}>{firstRoutine.name}</Text>
                <Text style={styles.upNextSub}>
                  {firstRoutine.user_routine_exercises.length} exercises
                </Text>
              </View>
              <Button
                label="Start"
                onPress={() => handleStartRoutine(firstRoutine.id)}
              />
            </View>
            {firstRoutine.user_routine_exercises.length > 0 && (
              <Text style={styles.upNextExercises} numberOfLines={2}>
                {[...firstRoutine.user_routine_exercises]
                  .sort((a, b) => a.order_index - b.order_index)
                  .slice(0, 4)
                  .map((e) => e.exercises?.name ?? '…')
                  .join('  ·  ')}
                {firstRoutine.user_routine_exercises.length > 4
                  ? `  +${firstRoutine.user_routine_exercises.length - 4} more`
                  : ''}
              </Text>
            )}
          </Card>
        ) : (
          <Card padding="default" style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Dumbbell size={28} color={colors.ink4} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No routines yet</Text>
            <Text style={styles.emptyCaption}>Create a routine to plan your training.</Text>
            <Button
              label="Create Routine"
              fullWidth
              onPress={() => router.push('/(modals)/create-routine')}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        {/* ── Recent Workout ─────────────────────────────── */}
        {lastWorkout && (
          <>
            <SectionRow label="Recent Activity" />
            <Card padding="default">
              <View style={styles.activityHeader}>
                <View style={styles.activityTitleWrap}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {lastWorkout.workout_type}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {relativeDate(lastWorkout.completed_at)}
                    {lastWorkout.duration_minutes
                      ? `  ·  ${lastWorkout.duration_minutes} min`
                      : ''}
                  </Text>
                </View>
                {lastWorkout.score_earned > 0 && (
                  <View style={styles.scoreEarned}>
                    <Trophy size={13} color={colors.accent} strokeWidth={2} />
                    <Text style={[styles.scoreEarnedText, numericStyle]}>
                      +{lastWorkout.score_earned}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.activityStats}>
                <ActivityStat
                  value={fmtVolume(lastWorkout.total_volume_kg)}
                  label="volume"
                />
                <View style={styles.activityStatDivider} />
                <ActivityStat
                  value={String(lastWorkout.total_sets)}
                  label="sets"
                />
                <View style={styles.activityStatDivider} />
                <ActivityStat
                  value={String(lastWorkout.total_exercises)}
                  label="exercises"
                />
              </View>

              {lastWorkout.workout_exercises.length > 0 && (
                <Text style={styles.activityExercises} numberOfLines={1}>
                  {lastWorkout.workout_exercises.slice(0, 3)
                    .map((e) => e.exercise_name).join('  ·  ')}
                  {lastWorkout.workout_exercises.length > 3
                    ? `  +${lastWorkout.workout_exercises.length - 3}`
                    : ''}
                </Text>
              )}
            </Card>
          </>
        )}

        {/* ── Today's Nutrition ──────────────────────────── */}
        {dietLogs.length > 0 && (
          <>
            <SectionRow label="Today's Nutrition" />
            <Card padding="default">
              <View style={styles.nutritionHeader}>
                <Text style={[styles.calCount, numericStyle]}>
                  {totalCal.toLocaleString()}
                </Text>
                <Text style={styles.calUnit}>kcal</Text>
              </View>
              <View style={styles.macroRow}>
                <MacroPill label="P" value={Math.round(totalProtein)} color="#4F7A5A" />
                <MacroPill label="C" value={Math.round(totalCarbs)}   color={colors.accent} />
                <MacroPill label="F" value={Math.round(totalFat)}     color="#8C6A4A" />
              </View>
              <Text style={styles.nutritionMeta}>
                {dietLogs.length} item{dietLogs.length !== 1 ? 's' : ''} logged today
              </Text>
            </Card>
          </>
        )}

        {/* ── Last Night's Sleep ─────────────────────────── */}
        {recentSleep && (
          <>
            <SectionRow label="Last Night's Sleep" />
            <Card padding="default">
              <View style={styles.sleepRow}>
                <Moon size={20} color={colors.ink3} strokeWidth={1.75} />
                <View style={styles.sleepInfo}>
                  <View style={styles.sleepTopRow}>
                    <Text style={[styles.sleepHours, numericStyle]}>
                      {recentSleep.hours.toFixed(1)}h
                    </Text>
                    {recentSleep.quality && (
                      <View style={[
                        styles.qualityBadge,
                        { backgroundColor: scoreBg(
                            recentSleep.quality === 'excellent' ? 80
                            : recentSleep.quality === 'good'    ? 65
                            : recentSleep.quality === 'fair'    ? 40
                            : 20) },
                      ]}>
                        <Text style={[
                          styles.qualityText,
                          { color: scoreColor(
                              recentSleep.quality === 'excellent' ? 80
                              : recentSleep.quality === 'good'    ? 65
                              : recentSleep.quality === 'fair'    ? 40
                              : 20) },
                        ]}>
                          {QUALITY_LABEL[recentSleep.quality] ?? recentSleep.quality}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sleepDate}>
                    {recentSleep.date === today ? 'Today' : 'Last night'}
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* ── Insights ───────────────────────────────────── */}
        {score?.insights && score.insights.length > 0 && (
          <>
            <SectionRow label="Insights" />
            <Card padding="default">
              {score.insights.map((ins, i) => (
                <View key={i} style={[styles.insightRow, i > 0 && styles.insightBorder]}>
                  <Text style={styles.insightType}>{ins.type.toUpperCase()}</Text>
                  <Text style={styles.insightMsg}>{ins.message}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionRow({
  label,
  action,
  onAction,
}: {
  label: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionHeader}>{label}</Text>
      {action && onAction && (
        <Pressable style={styles.sectionAction} onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <ChevronRight size={14} color={colors.accent} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

function BodyPartBar({ label, value }: { label: string; value: number | null }) {
  const pct = value !== null ? Math.min(Math.max(value, 0), 100) : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%` }]} />
      </View>
      <Text style={[barStyles.val, numericStyle]}>
        {value !== null ? value : '—'}
      </Text>
    </View>
  );
}

function SubScoreCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
}) {
  const clr = scoreColor(value);
  const bg  = scoreBg(value);
  return (
    <Card padding="compact" style={styles.subCard}>
      <View style={[styles.subIconWrap, { backgroundColor: bg }]}>{icon}</View>
      <Text style={[styles.subValue, numericStyle, { color: clr }]}>
        {value !== null ? value : '—'}
      </Text>
      <Text style={styles.subLabel}>{label}</Text>
    </Card>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
      onPress={onPress}
    >
      <View style={styles.actionIconWrap}>
        <Icon size={20} color={colors.accent} strokeWidth={1.75} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function ActivityStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.activityStat}>
      <Text style={[styles.activityStatVal, numericStyle]}>{value}</Text>
      <Text style={styles.activityStatLbl}>{label}</Text>
    </View>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color + '18' }]}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <Text style={[styles.macroVal, numericStyle, { color }]}>{value}g</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.md,
  } satisfies ViewStyle,

  // Greeting
  greetingBlock: { marginBottom: spacing.xs } satisfies ViewStyle,
  greetingText: { ...(typography.heading as TextStyle) } satisfies TextStyle,
  dateText: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,

  // Body Score card
  cardLabel: { ...(typography.label as TextStyle), marginBottom: spacing.md } satisfies TextStyle,
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  } satisfies ViewStyle,
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    position: 'relative',
    flexShrink: 0,
  } satisfies ViewStyle,
  ringCenter: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  scoreNum: { ...(typography.display as TextStyle) } satisfies TextStyle,
  scoreSub: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  barsCol: { flex: 1, gap: spacing.sm } satisfies ViewStyle,

  // Section row
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  } satisfies ViewStyle,
  sectionHeader: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  } satisfies ViewStyle,
  sectionActionText: {
    ...(typography.label as TextStyle),
    color: colors.accent,
  } satisfies TextStyle,

  // Sub-score row
  subScoreRow: { flexDirection: 'row', gap: spacing.sm } satisfies ViewStyle,
  subCard: { flex: 1, alignItems: 'center', gap: spacing.xs } satisfies ViewStyle,
  subIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  subValue: { ...(typography.subheading as TextStyle), fontSize: 22 } satisfies TextStyle,
  subLabel: { ...(typography.label as TextStyle), color: colors.ink3 } satisfies TextStyle,

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: spacing.sm } satisfies ViewStyle,
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  } satisfies ViewStyle,
  actionBtnPressed: { opacity: 0.65 } satisfies ViewStyle,
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  actionLabel: {
    ...(typography.label as TextStyle),
    color: colors.ink2,
    textAlign: 'center',
  } satisfies TextStyle,

  // Up Next card
  upNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  } satisfies ViewStyle,
  upNextMeta: { flex: 1 } satisfies ViewStyle,
  upNextName: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  upNextSub: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,
  upNextExercises: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  // Empty state
  emptyCard: { alignItems: 'center' } satisfies ViewStyle,
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  } satisfies ViewStyle,
  emptyTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  emptyCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    textAlign: 'center',
    marginTop: 4,
  } satisfies TextStyle,

  // Recent Workout
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  } satisfies ViewStyle,
  activityTitleWrap: { flex: 1 } satisfies ViewStyle,
  activityTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  activityMeta: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,
  scoreEarned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  scoreEarnedText: {
    ...(typography.label as TextStyle),
    color: colors.accent,
  } satisfies TextStyle,
  activityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.input,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  } satisfies ViewStyle,
  activityStat: { flex: 1, alignItems: 'center' } satisfies ViewStyle,
  activityStatVal: {
    ...(typography.subheading as TextStyle),
    fontSize: 16,
  } satisfies TextStyle,
  activityStatLbl: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
    marginTop: 1,
  } satisfies TextStyle,
  activityStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.surfaceElevBorder,
  } satisfies ViewStyle,
  activityExercises: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  // Nutrition
  nutritionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  } satisfies ViewStyle,
  calCount: { ...(typography.display as TextStyle), fontSize: 28 } satisfies TextStyle,
  calUnit: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,
  macroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  } satisfies ViewStyle,
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  macroLabel: {
    ...(typography.label as TextStyle),
    fontSize: 11,
    fontWeight: '700',
  } satisfies TextStyle,
  macroVal: {
    ...(typography.bodyMedium as TextStyle),
    fontSize: 13,
  } satisfies TextStyle,
  nutritionMeta: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  // Sleep
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } satisfies ViewStyle,
  sleepInfo: { flex: 1 } satisfies ViewStyle,
  sleepTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } satisfies ViewStyle,
  sleepHours: { ...(typography.subheading as TextStyle), fontSize: 22 } satisfies TextStyle,
  qualityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  qualityText: { ...(typography.label as TextStyle) } satisfies TextStyle,
  sleepDate: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,

  // Insights
  insightRow: { paddingVertical: spacing.sm } satisfies ViewStyle,
  insightBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  } satisfies ViewStyle,
  insightType: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
    marginBottom: 2,
  } satisfies TextStyle,
  insightMsg: {
    ...(typography.body as TextStyle),
    color: colors.ink1,
  } satisfies TextStyle,
});

const barStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  } satisfies ViewStyle,
  label: {
    ...(typography.caption as TextStyle),
    width: 40,
    color: colors.ink3,
  } satisfies TextStyle,
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    overflow: 'hidden',
  } satisfies ViewStyle,
  fill: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  } satisfies ViewStyle,
  val: {
    ...(typography.caption as TextStyle),
    width: 24,
    textAlign: 'right',
    color: colors.ink2,
  } satisfies TextStyle,
});
