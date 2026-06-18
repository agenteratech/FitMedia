import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';
import { useFocusEffect, useRouter } from 'expo-router';
import { AlertCircle, CheckCircle, ChevronRight, Dumbbell, Flame, Info, Moon, Plus, Trophy, Zap } from 'lucide-react-native';
import { useDailyScore } from '../../hooks/useDailyScore';
import { useStreak } from '../../hooks/useStreak';
import { useLeaderboard, type LeaderboardEntry } from '../../hooks/useLeaderboard';
import { useWorkoutHistory } from '../../hooks/useWorkoutHistory';
import { useSleepLogs } from '../../hooks/useSleepLogs';
import { useDietLogs } from '../../hooks/useDietLogs';
import { useRoutines } from '../../hooks/useRoutines';
import { useRoutineOrder } from '../../hooks/useRoutineOrder';
import { useAuthStore } from '../../stores/authStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { supabase } from '../../lib/supabase';
import { getJSON, storageKeys } from '../../lib/storage';
import { primaryMuscleLabel } from '../../lib/workouts/muscles';
import { Button, Card, Sheet } from '../../src/components/primitives';
import { CompanionTutorial } from '../../src/components/companion/CompanionTutorial';
import { CompanionAvatarButton, CompanionSheet } from '../../src/components/companion/CompanionSheet';
import { useCompanion } from '../../hooks/useCompanion';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';
import { requestLogsSegment } from '../../lib/logsSegmentRequest';

// ─── Ring constants ────────────────────────────────────────────────────────────
const RING_SIZE = 120;
const RING_STROKE = 10;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// Visual reference max for ring fill — ring looks "full" at this display value.
// Chosen as the elite advanced target (~5+ years dedicated).
const RING_DISPLAY_MAX = 300;

// ─── Muscle group → body-highlighter slug mapping ────────────────────────────
const GROUP_SLUGS: Record<string, Slug[]> = {
  chest:     ['chest'],
  back:      ['upper-back', 'lower-back', 'trapezius'],
  shoulders: ['deltoids'],
  arms:      ['biceps', 'triceps', 'forearm'],
  legs:      ['quadriceps', 'hamstring', 'gluteal', 'adductors', 'calves'],
  core:      ['abs', 'obliques'],
};

const GROUP_LABELS: Record<string, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders',
  arms: 'Arms', legs: 'Legs', core: 'Core',
};

const GROUP_ABBR: Record<string, string> = {
  chest: 'CH', back: 'BK', shoulders: 'SH',
  arms: 'AR', legs: 'LG', core: 'CO',
};

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
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
}

// For 0–100 daily performance scores (workout / diet / sleep)
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

// For body-part scores on the unbounded power-law scale
function bodyScoreColor(v: number): string {
  if (v >= 80) return colors.success;
  if (v >= 40) return colors.accent;
  return colors.alert;
}

// Daily-stimulus heatmap — red intensity reflects how hard a muscle was trained
// TODAY, not long-term score. Uses the science-based per-set stimulus value:
//   Stset = ln(loadRatio × reps × eMod + 1)   (RIR-weighted, load-relative)
//
// Reference calibration (solid session ≈ 5–6 work sets near failure = STIM_REF):
//   ~0.5  → 1 light set            → faint red  (opacity ~0.25)
//   ~2–4  → 3–4 moderate sets      → medium red  (opacity ~0.50–0.65)
//   ~6–8  → 5–6 hard/failure sets  → deep red   (opacity ~0.80–0.95)
const STIM_REF = 8.0;

function stimulusColor(stimulus: number): string {
  const opacity = (0.20 + (Math.min(stimulus, STIM_REF) / STIM_REF) * 0.75).toFixed(2);
  return `rgba(210, 40, 40, ${opacity})`;
}

const QUALITY_LABEL: Record<string, string> = {
  excellent: 'Excellent', good: 'Good', fair: 'Fair', poor: 'Poor', okay: 'Okay',
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { user } = useAuthStore();
  const { reset, setWorkoutType, setStartedAt, upsertExercise } = useWorkoutStore();

  // Data hooks
  const { score, loading: scoreLoading, refresh: refreshScore } = useDailyScore();
  const streak = useStreak();

  // Re-fetch score every time this tab comes into focus so the silhouette
  // reflects any workout just saved (edge function runs async after save).
  useFocusEffect(useCallback(() => { refreshScore(); }, [refreshScore]));
  const { items: workouts }   = useWorkoutHistory();
  const { items: sleepItems } = useSleepLogs();
  const { items: dietLogs }   = useDietLogs();
  const { items: rawRoutines } = useRoutines();
  const { orderedItems: routines } = useRoutineOrder(rawRoutines);

  // AI Companion
  const companion = useCompanion();
  const [showCompanionSheet, setShowCompanionSheet] = useState(false);

  // Persist "tutorial seen" to MMKV the moment it first appears so a
  // force-quit before the notification step doesn't re-show the tutorial.
  useEffect(() => {
    if (!companion.tutorialSeen) companion.persistTutorialSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaderboard
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const { entries: lbEntries, currentUser: lbCurrentUser, loading: lbLoading, error: lbError } = useLeaderboard(50);

  // Log Workout sheet
  const [showWorkoutSheet, setShowWorkoutSheet] = useState(false);

  // Body heatmap side toggle
  const [heatSide, setHeatSide] = useState<'front' | 'back'>('front');

  // User display name + gender for silhouette
  const [displayName, setDisplayName] = useState('');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  useEffect(() => {
    if (!user) return;
    supabase.from('users').select('name, gender').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.name) setDisplayName(data.name);
        setUserGender(data?.gender === 'female' ? 'female' : 'male');
      });
  }, [user]);
  const nameLabel = displayName || user?.email?.split('@')[0] || '';

  // Animated ring
  const animOffset = useRef(new Animated.Value(RING_CIRC)).current;
  useEffect(() => {
    if (!scoreLoading && score) {
      Animated.timing(animOffset, {
        toValue: RING_CIRC * (1 - Math.min(score.total_score, RING_DISPLAY_MAX) / RING_DISPLAY_MAX),
        duration: 1100,
        delay: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [scoreLoading, score?.total_score]);

  // Body part scores from daily_scores.body_part_scores
  const bodyPartScores = useMemo<Record<string, number>>(() => {
    const bps = score?.body_part_scores ?? {};
    return {
      chest:     Number(bps.chest     ?? 0),
      back:      Number(bps.back      ?? 0),
      shoulders: Number(bps.shoulders ?? 0),
      arms:      Number(bps.arms      ?? 0),
      legs:      Number(bps.legs      ?? 0),
      core:      Number(bps.core      ?? 0),
    };
  }, [score]);

  // Today's stimulus per muscle group — drives the silhouette colour.
  // Only muscles actually trained today get a non-zero value; rest stay gray.
  const todayStimulus = useMemo<Record<string, number>>(() => {
    const tms = score?.today_muscle_stimulus ?? {};
    return {
      chest:     Number(tms.chest     ?? 0),
      back:      Number(tms.back      ?? 0),
      shoulders: Number(tms.shoulders ?? 0),
      arms:      Number(tms.arms      ?? 0),
      legs:      Number(tms.legs      ?? 0),
      core:      Number(tms.core      ?? 0),
    };
  }, [score]);

  // Body highlighter data — slugs colour red based on TODAY's training stimulus.
  // Intensity = how hard that group was hit (sets × load × effort).
  // Gray = not trained today.
  const bodyData = useMemo<ExtendedBodyPart[]>(() => {
    return Object.entries(GROUP_SLUGS).flatMap(([group, slugs]) =>
      slugs.map(slug => ({
        slug,
        color: todayStimulus[group] > 0
          ? stimulusColor(todayStimulus[group])
          : colors.surfaceSunk,
      }))
    );
  }, [todayStimulus]);

  // Body highlighter scale to fill card width
  // card width = screen − scroll padding (2×24) − card padding (2×16)
  const cardInner = screenWidth - spacing['2xl'] * 2 - spacing.lg * 2;
  // Front + back side by side with a gap
  const bodyScale = Math.min(0.85, (cardInner - spacing.lg) / 2 / 200);

  // Derived
  const totalScore   = score?.total_score ?? 0;
  const lastWorkout  = workouts[0] ?? null;
  const today        = new Date().toISOString().slice(0, 10);
  const yesterday    = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const recentSleep  = sleepItems.find(s => s.date === today || s.date === yesterday) ?? null;
  const totalCal     = useMemo(() => dietLogs.reduce((s, l) => s + (l.calories  ?? 0), 0), [dietLogs]);
  const totalProtein = useMemo(() => dietLogs.reduce((s, l) => s + (l.protein_g ?? 0), 0), [dietLogs]);
  const totalCarbs   = useMemo(() => dietLogs.reduce((s, l) => s + (l.carbs_g   ?? 0), 0), [dietLogs]);
  const totalFat     = useMemo(() => dietLogs.reduce((s, l) => s + (l.fats_g    ?? 0), 0), [dietLogs]);
  const firstRoutine = routines[0] ?? null;

  // Start routine (mirrors routines.tsx)
  const handleStartRoutine = (routineId: string) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;
    const weightCache = getJSON<Record<string, number>>(storageKeys.routineWeights) ?? {};
    reset();
    setWorkoutType(routine.name);
    setStartedAt(new Date().toISOString());
    [...routine.user_routine_exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((rex, idx) => {
        const defaultWeight = weightCache[`${routineId}_${rex.exercise_id}`] ?? 0;
        upsertExercise({
          exerciseId:    rex.exercise_id,
          name:          rex.exercises?.name ?? 'Exercise',
          primaryMuscle: primaryMuscleLabel(rex.exercises?.primary_muscles),
          orderIndex: idx,
          sets: Array.from({ length: rex.default_sets }, (_, i) => ({
            setNumber: i + 1, weight: defaultWeight, reps: rex.default_reps, completed: false, isPR: false,
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
          <View style={styles.greetingRow}>
            <View>
              <Text style={styles.greetingText}>
                {greeting()}{nameLabel ? `, ${nameLabel}` : ''}
              </Text>
              <Text style={styles.dateText}>{fmtDate(new Date())}</Text>
            </View>
            <View style={styles.greetingActions}>
              <Pressable
                style={({ pressed }) => [styles.trophyBtn, pressed && { opacity: 0.6 }]}
                onPress={() => setShowLeaderboard(true)}
                accessibilityLabel="Open leaderboard"
              >
                <Trophy size={22} color={colors.ink2} strokeWidth={1.75} />
              </Pressable>
              {companion.enabled && (
                <CompanionAvatarButton onPress={() => setShowCompanionSheet(true)} />
              )}
            </View>
          </View>
        </View>

        {/* ── Body Score hero ────────────────────────────── */}
        <Card padding="comfortable">
          <View style={styles.heroRow}>
            {/* Animated ring */}
            <View style={styles.ringWrap}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                <Circle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                  stroke={colors.surfaceSunk} strokeWidth={RING_STROKE} fill="none"
                />
                <AnimatedCircle
                  cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
                  stroke={bodyScoreColor(totalScore)} strokeWidth={RING_STROKE} fill="none"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={animOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={[styles.scoreNum, numericStyle]}>
                  {scoreLoading ? '—' : totalScore}
                </Text>
                <Text style={styles.scoreSub}>pts</Text>
              </View>
            </View>

            {/* Score meta */}
            <View style={styles.heroMeta}>
              <Text style={styles.heroLabel}>BODY SCORE</Text>
              <Text style={[styles.heroTitle, { color: bodyScoreColor(totalScore) }]}>
                {totalScore >= 180 ? 'Elite'
                  : totalScore >= 120 ? 'Strong'
                  : totalScore >= 70  ? 'Building'
                  : totalScore >= 30  ? 'Starting'
                  : 'Beginner'}
              </Text>
              <Text style={styles.heroCaption}>
                {score?.insights?.[0]?.message ?? 'Keep showing up — progress compounds.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Today's sub-scores ─────────────────────────── */}
        <View style={styles.subScoreRow}>
          <SubScoreCard
            icon={<Dumbbell size={15} color={scoreColor(score?.workout_score ?? null)} strokeWidth={1.75} />}
            label="Workout"
            value={score?.workout_score ?? null}
          />
          <SubScoreCard
            icon={<Zap size={15} color={scoreColor(score?.diet_score ?? null)} strokeWidth={1.75} />}
            label="Diet"
            value={score?.diet_score ?? null}
          />
          <SubScoreCard
            icon={<Moon size={15} color={scoreColor(score?.sleep_score ?? null)} strokeWidth={1.75} />}
            label="Sleep"
            value={score?.sleep_score ?? null}
          />
        </View>

        {/* ── Streak ────────────────────────────────────── */}
        {!streak.loading && <StreakCard streak={streak} />}

        {/* ── Muscle heatmap ─────────────────────────────── */}
        <SectionRow label="Muscle Overview" />
        <Card padding="default">
          {/* Front / Back toggle */}
          <View style={styles.sideToggle}>
            <Pressable
              style={[styles.sideBtn, heatSide === 'front' && styles.sideBtnActive]}
              onPress={() => setHeatSide('front')}
            >
              <Text style={[styles.sideBtnText, heatSide === 'front' && styles.sideBtnTextActive]}>
                Front
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sideBtn, heatSide === 'back' && styles.sideBtnActive]}
              onPress={() => setHeatSide('back')}
            >
              <Text style={[styles.sideBtnText, heatSide === 'back' && styles.sideBtnTextActive]}>
                Back
              </Text>
            </Pressable>
          </View>

          {/* Body silhouette */}
          <View style={styles.bodyWrap}>
            <Body
              data={bodyData}
              side={heatSide}
              gender={userGender}
              scale={bodyScale}
              defaultFill={colors.surfaceSunk}
              border="none"
            />
          </View>

          {/* Intensity legend */}
          <View style={styles.legendRow}>
            <Text style={styles.legendLabel}>Light</Text>
            <View style={styles.legendSwatches}>
              {[0.20, 0.36, 0.53, 0.70, 0.95].map(o => (
                <View
                  key={o}
                  style={[styles.legendSwatch, { backgroundColor: `rgba(210,40,40,${o})` }]}
                />
              ))}
            </View>
            <Text style={styles.legendLabel}>Intense</Text>
          </View>
        </Card>

        {/* ── Muscle Groups ──────────────────────────────── */}
        <SectionRow label="Muscle Groups" />
        <Card padding="default">
          {['chest', 'back', 'shoulders', 'arms', 'legs', 'core'].map((group, i, arr) => (
            <MuscleGroupRow
              key={group}
              abbr={GROUP_ABBR[group]}
              label={GROUP_LABELS[group]}
              score={bodyPartScores[group]}
              last={i === arr.length - 1}
            />
          ))}
        </Card>

        {/* ── Quick actions ──────────────────────────────── */}
        <SectionRow label="Quick Actions" />
        <View style={styles.actionsRow}>
          <ActionBtn icon={Dumbbell} label="Log Workout" onPress={() => setShowWorkoutSheet(true)} />
          <ActionBtn icon={Plus}    label="Log Food"       onPress={() => { requestLogsSegment('diet');  router.push('/(tabs)/logs'); }} />
          <ActionBtn icon={Moon}    label="Log Sleep"      onPress={() => { requestLogsSegment('sleep'); router.push('/(tabs)/logs'); }} />
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
              <Button label="Start" onPress={() => handleStartRoutine(firstRoutine.id)} />
            </View>
            {firstRoutine.user_routine_exercises.length > 0 && (
              <Text style={styles.upNextExercises} numberOfLines={2}>
                {[...firstRoutine.user_routine_exercises]
                  .sort((a, b) => a.order_index - b.order_index)
                  .slice(0, 4)
                  .map(e => e.exercises?.name ?? '…')
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
                  <Text style={styles.activityTitle} numberOfLines={1}>{lastWorkout.workout_type}</Text>
                  <Text style={styles.activityMeta}>
                    {relativeDate(lastWorkout.completed_at)}
                    {lastWorkout.duration_minutes ? `  ·  ${lastWorkout.duration_minutes} min` : ''}
                  </Text>
                </View>
                {lastWorkout.score_earned > 0 && (
                  <View style={styles.scoreEarned}>
                    <Trophy size={13} color={colors.accent} strokeWidth={2} />
                    <Text style={[styles.scoreEarnedText, numericStyle]}>+{lastWorkout.score_earned}</Text>
                  </View>
                )}
              </View>
              <View style={styles.activityStats}>
                <ActivityStat value={fmtVolume(lastWorkout.total_volume_kg)} label="volume" />
                <View style={styles.activityStatDivider} />
                <ActivityStat value={String(lastWorkout.total_sets)}      label="sets" />
                <View style={styles.activityStatDivider} />
                <ActivityStat value={String(lastWorkout.total_exercises)}  label="exercises" />
              </View>
              {lastWorkout.workout_exercises.length > 0 && (
                <Text style={styles.activityExercises} numberOfLines={1}>
                  {lastWorkout.workout_exercises.slice(0, 3).map(e => e.exercise_name).join('  ·  ')}
                  {lastWorkout.workout_exercises.length > 3 ? `  +${lastWorkout.workout_exercises.length - 3}` : ''}
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
                <Text style={[styles.calCount, numericStyle]} numberOfLines={1}>
                  {Math.round(totalCal).toLocaleString('en-US')}
                </Text>
                <Text style={styles.calUnit} numberOfLines={1}>kcal</Text>
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
                    <Text style={[styles.sleepHours, numericStyle]}>{recentSleep.hours.toFixed(1)}h</Text>
                    {recentSleep.quality && (
                      <View style={[styles.qualityBadge, { backgroundColor: scoreBg(
                          recentSleep.quality === 'excellent' ? 80
                          : recentSleep.quality === 'good'    ? 65
                          : recentSleep.quality === 'okay'    ? 45
                          : 20) }]}>
                        <Text style={[styles.qualityText, { color: scoreColor(
                            recentSleep.quality === 'excellent' ? 80
                            : recentSleep.quality === 'good'    ? 65
                            : recentSleep.quality === 'okay'    ? 45
                            : 20) }]}>
                          {QUALITY_LABEL[recentSleep.quality] ?? recentSleep.quality}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sleepDate}>{recentSleep.date === today ? 'Today' : 'Last night'}</Text>
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
                <InsightRow key={i} insight={ins} last={i === score.insights.length - 1} />
              ))}
            </Card>
          </>
        )}

      </ScrollView>

      {/* ── AI Companion tutorial ─────────────────────── */}
      <CompanionTutorial
        visible={!companion.tutorialSeen}
        personality={companion.personality}
        categories={companion.categories}
        onComplete={(granted) => {
          companion.setNotificationsGranted(granted);
          companion.markTutorialSeen();
        }}
      />

      {/* ── Companion sheet ────────────────────────────── */}
      <CompanionSheet
        visible={showCompanionSheet}
        onClose={() => setShowCompanionSheet(false)}
        personality={companion.personality}
        onOpenSettings={() => router.push('/(modals)/companion-settings')}
      />

      {/* ── Leaderboard sheet ─────────────────────────── */}
      <Sheet visible={showLeaderboard} onClose={() => setShowLeaderboard(false)} snapPoints={['80%']}>
        <View style={styles.lbSheetHead}>
          <Trophy size={18} color={colors.accent} strokeWidth={1.75} />
          <Text style={styles.lbSheetTitle}>Leaderboard</Text>
        </View>
        <Text style={styles.lbSheetSub}>Ranked by active session streak</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.lbScroll}>
          {lbLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: spacing['3xl'] }} />
          ) : lbError ? (
            <Text style={styles.lbEmpty}>Could not load leaderboard: {lbError}</Text>
          ) : lbEntries.length === 0 ? (
            <Text style={styles.lbEmpty}>No data yet — complete a workout to appear here!</Text>
          ) : (
            <>
              {lbEntries.map((entry, idx) => (
                <LeaderboardRow key={entry.userId} entry={entry} showDivider={idx > 0} />
              ))}
              {lbCurrentUser && (
                <>
                  <View style={styles.lbDash} />
                  <LeaderboardRow entry={lbCurrentUser} showDivider={false} />
                </>
              )}
            </>
          )}
          <View style={{ height: insets.bottom + spacing['2xl'] }} />
        </ScrollView>
      </Sheet>

      {/* ── Log Workout sheet ──────────────────────────── */}
      <Sheet visible={showWorkoutSheet} onClose={() => setShowWorkoutSheet(false)}>
        <Text style={styles.wkSheetTitle}>Log Workout</Text>
        <View style={styles.wkSheetDivider} />

        {/* Option: pick a saved routine */}
        <Pressable
          style={styles.wkSheetRow}
          onPress={() => {
            setShowWorkoutSheet(false);
            setTimeout(() => router.push('/(tabs)/routines'), 300);
          }}
        >
          <View style={styles.wkSheetIconWrap}>
            <Dumbbell size={18} color={colors.accent} strokeWidth={1.75} />
          </View>
          <View style={styles.wkSheetRowText}>
            <Text style={styles.wkSheetRowLabel}>Start a Routine</Text>
            <Text style={styles.wkSheetRowCaption}>Choose from your saved routines</Text>
          </View>
          <ChevronRight size={16} color={colors.ink4} strokeWidth={1.75} />
        </Pressable>

        <View style={styles.wkSheetDivider} />

        {/* Option: freestyle / no plan */}
        <Pressable
          style={styles.wkSheetRow}
          onPress={() => {
            setShowWorkoutSheet(false);
            setTimeout(
              () => router.push('/(modals)/active-workout?mode=freestyle'),
              300,
            );
          }}
        >
          <View style={styles.wkSheetIconWrap}>
            <Zap size={18} color={colors.accent} strokeWidth={1.75} />
          </View>
          <View style={styles.wkSheetRowText}>
            <Text style={styles.wkSheetRowLabel}>Freestyle Workout</Text>
            <Text style={styles.wkSheetRowCaption}>Log any exercises without a plan</Text>
          </View>
          <ChevronRight size={16} color={colors.ink4} strokeWidth={1.75} />
        </Pressable>

        <View style={[styles.wkSheetCancel, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Button
            label="Cancel"
            variant="secondary"
            fullWidth
            onPress={() => setShowWorkoutSheet(false)}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionRow({
  label, action, onAction,
}: { label: string; action?: string; onAction?: () => void }) {
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

function SubScoreCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | null }) {
  const clr = scoreColor(value);
  const bg  = scoreBg(value);
  return (
    <View style={[styles.subCard, { backgroundColor: colors.surface, borderColor: colors.surfaceElevBorder }]}>
      <View style={[styles.subIconWrap, { backgroundColor: bg }]}>{icon}</View>
      <Text style={[styles.subValue, numericStyle, { color: clr }]}>{value !== null ? value : '—'}</Text>
      <Text style={styles.subLabel}>{label}</Text>
    </View>
  );
}

// Bar reference: 250 display pts = "full bar" (strong intermediate level)
const MUSCLE_BAR_MAX = 250;

function MuscleGroupRow({
  abbr, label, score, last,
}: { abbr: string; label: string; score: number; last: boolean }) {
  const clr = bodyScoreColor(score);
  const pct = Math.min((Math.max(score, 0) / MUSCLE_BAR_MAX) * 100, 100);
  return (
    <View style={[mgStyles.row, !last && mgStyles.rowBorder]}>
      <View style={mgStyles.icon}>
        <Text style={mgStyles.iconText}>{abbr}</Text>
      </View>
      <View style={mgStyles.content}>
        <View style={mgStyles.topRow}>
          <Text style={mgStyles.name}>{label}</Text>
          <Text style={[mgStyles.score, numericStyle, { color: clr }]}>{score > 0 ? score : '—'}</Text>
        </View>
        <View style={mgStyles.track}>
          <View style={[mgStyles.fill, { width: `${pct}%` as any, backgroundColor: clr }]} />
        </View>
      </View>
    </View>
  );
}

function InsightRow({ insight, last }: { insight: { type: string; message: string }; last: boolean }) {
  const isWarning = insight.type === 'warning';
  const isSuccess = insight.type === 'success';
  const bgColor   = isWarning ? '#F6DDD9' : isSuccess ? colors.successSoft : colors.accentSoft;
  const iconColor = isWarning ? colors.alert : isSuccess ? colors.success : colors.accent;
  const Icon      = isWarning ? AlertCircle : isSuccess ? CheckCircle : Info;
  return (
    <View style={[insightStyles.row, !last && insightStyles.rowBorder]}>
      <View style={[insightStyles.iconWrap, { backgroundColor: bgColor }]}>
        <Icon size={14} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={insightStyles.msg} numberOfLines={3}>{insight.message}</Text>
    </View>
  );
}

function ActionBtn({
  icon: Icon, label, onPress,
}: { icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>; label: string; onPress: () => void }) {
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

function StreakCard({ streak }: { streak: ReturnType<typeof useStreak> }) {
  const isActive = streak.current > 0;
  const iconBg   = isActive ? colors.accentSoft : colors.surfaceSunk;
  const iconClr  = isActive ? colors.accent : colors.ink3;

  return (
    <Card padding="compact">
      <View style={skStyles.row}>
        <View style={[skStyles.iconWrap, { backgroundColor: iconBg }]}>
          <Flame size={18} color={iconClr} strokeWidth={1.75} />
        </View>
        <View style={skStyles.info}>
          <Text style={[skStyles.count, numericStyle, { color: isActive ? colors.ink1 : colors.ink3 }]}>
            {streak.current}
          </Text>
          <Text style={[skStyles.label, { color: isActive ? colors.ink2 : colors.ink3 }]}>
            {isActive ? 'session streak' : 'No active streak'}
          </Text>
        </View>
        {streak.longest > 0 && (
          <View style={skStyles.best}>
            <Text style={skStyles.bestLabel}>Best</Text>
            <Text style={[skStyles.bestVal, numericStyle]}>{streak.longest}</Text>
          </View>
        )}
      </View>
    </Card>
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
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } satisfies ViewStyle,
  greetingText:  { ...(typography.heading as TextStyle) } satisfies TextStyle,
  dateText: { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 2 } satisfies TextStyle,
  greetingActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } satisfies ViewStyle,
  trophyBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,

  // Body Score hero
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg } satisfies ViewStyle,
  ringWrap: { width: RING_SIZE, height: RING_SIZE, flexShrink: 0, position: 'relative' } satisfies ViewStyle,
  ringCenter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' } satisfies ViewStyle,
  scoreNum: { ...(typography.display as TextStyle), fontSize: 26 } satisfies TextStyle,
  scoreSub: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  heroMeta: { flex: 1 } satisfies ViewStyle,
  heroLabel: { ...(typography.label as TextStyle), color: colors.ink3, marginBottom: 4 } satisfies TextStyle,
  heroTitle: { ...(typography.subheading as TextStyle), fontSize: 20, marginBottom: 4 } satisfies TextStyle,
  heroCaption: { ...(typography.caption as TextStyle), color: colors.ink2, lineHeight: 18 } satisfies TextStyle,

  // Sub-scores
  subScoreRow: { flexDirection: 'row', gap: spacing.sm } satisfies ViewStyle,
  subCard: {
    flex: 1, alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    borderRadius: radius.card, borderWidth: 1,
  } satisfies ViewStyle,
  subIconWrap: { width: 30, height: 30, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center' } satisfies ViewStyle,
  subValue: { ...(typography.subheading as TextStyle), fontSize: 20 } satisfies TextStyle,
  subLabel: { ...(typography.label as TextStyle), color: colors.ink3 } satisfies TextStyle,

  // Heatmap
  sideToggle: {
    flexDirection: 'row', alignSelf: 'center',
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.buttonCompact,
    padding: 3, marginBottom: spacing.md,
  } satisfies ViewStyle,
  sideBtn: {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.buttonCompact - 4,
  } satisfies ViewStyle,
  sideBtnActive: { backgroundColor: colors.ink1 } satisfies ViewStyle,
  sideBtnText: { ...(typography.label as TextStyle), color: colors.ink3 } satisfies TextStyle,
  sideBtnTextActive: { color: colors.bg } satisfies TextStyle,
  bodyWrap: { alignItems: 'center', marginBottom: spacing.md } satisfies ViewStyle,
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm } satisfies ViewStyle,
  legendSwatches: { flexDirection: 'row', gap: 3 } satisfies ViewStyle,
  legendSwatch: { width: 16, height: 7, borderRadius: 2 } satisfies ViewStyle,
  legendLabel: { ...(typography.label as TextStyle), color: colors.ink3, fontSize: 10 } satisfies TextStyle,

  // Section row
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: spacing.xs,
  } satisfies ViewStyle,
  sectionHeader: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 } satisfies ViewStyle,
  sectionActionText: { ...(typography.label as TextStyle), color: colors.accent } satisfies TextStyle,

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: spacing.sm } satisfies ViewStyle,
  actionBtn: {
    flex: 1, alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.card, borderWidth: 1, borderColor: colors.surfaceElevBorder,
    paddingVertical: spacing.lg, paddingHorizontal: spacing.sm,
  } satisfies ViewStyle,
  actionBtnPressed: { opacity: 0.65 } satisfies ViewStyle,
  actionIconWrap: {
    width: 40, height: 40, borderRadius: radius.input,
    backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  } satisfies ViewStyle,
  actionLabel: { ...(typography.label as TextStyle), color: colors.ink2, textAlign: 'center' } satisfies TextStyle,

  // Up Next
  upNextHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm } satisfies ViewStyle,
  upNextMeta:   { flex: 1 } satisfies ViewStyle,
  upNextName:   { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  upNextSub:    { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 2 } satisfies TextStyle,
  upNextExercises: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,

  // Empty state
  emptyCard:    { alignItems: 'center' } satisfies ViewStyle,
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  } satisfies ViewStyle,
  emptyTitle:   { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  emptyCaption: { ...(typography.caption as TextStyle), color: colors.ink3, textAlign: 'center', marginTop: 4 } satisfies TextStyle,

  // Recent Workout
  activityHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.md } satisfies ViewStyle,
  activityTitleWrap: { flex: 1 } satisfies ViewStyle,
  activityTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  activityMeta:  { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 2 } satisfies TextStyle,
  scoreEarned: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill,
  } satisfies ViewStyle,
  scoreEarnedText: { ...(typography.label as TextStyle), color: colors.accent } satisfies TextStyle,
  activityStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.input, paddingVertical: spacing.sm, marginBottom: spacing.sm,
  } satisfies ViewStyle,
  activityStat:     { flex: 1, alignItems: 'center' } satisfies ViewStyle,
  activityStatVal:  { ...(typography.subheading as TextStyle), fontSize: 16 } satisfies TextStyle,
  activityStatLbl:  { ...(typography.label as TextStyle), color: colors.ink3, marginTop: 1 } satisfies TextStyle,
  activityStatDivider: { width: 1, height: 28, backgroundColor: colors.surfaceElevBorder } satisfies ViewStyle,
  activityExercises: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,

  // Nutrition
  nutritionHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.sm } satisfies ViewStyle,
  calCount: {
    ...(typography.display as TextStyle),
    fontSize: 28,
    flexShrink: 0,        // never compress — prevents the number from wrapping
  } satisfies TextStyle,
  calUnit: {
    ...(typography.bodyMedium as TextStyle),
    color: colors.ink3,
    flexShrink: 0,
  } satisfies TextStyle,
  macroRow:  { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm } satisfies ViewStyle,
  macroPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill } satisfies ViewStyle,
  macroLabel: { ...(typography.label as TextStyle), fontSize: 11, fontWeight: '700' } satisfies TextStyle,
  macroVal:   { ...(typography.bodyMedium as TextStyle), fontSize: 13 } satisfies TextStyle,
  nutritionMeta: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,

  // Log Workout sheet
  wkSheetTitle: {
    ...(typography.subheading as TextStyle),
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.lg,
  } satisfies TextStyle,
  wkSheetDivider: { height: 1, backgroundColor: colors.surfaceElevBorder } satisfies ViewStyle,
  wkSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  } satisfies ViewStyle,
  wkSheetIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.input,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } satisfies ViewStyle,
  wkSheetRowText: { flex: 1 } satisfies ViewStyle,
  wkSheetRowLabel: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  wkSheetRowCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginTop: 2,
  } satisfies TextStyle,
  wkSheetCancel: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
  } satisfies ViewStyle,

  // Sleep
  sleepRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md } satisfies ViewStyle,
  sleepInfo:  { flex: 1 } satisfies ViewStyle,
  sleepTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm } satisfies ViewStyle,
  sleepHours: { ...(typography.subheading as TextStyle), fontSize: 22 } satisfies TextStyle,
  qualityBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill } satisfies ViewStyle,
  qualityText:  { ...(typography.label as TextStyle) } satisfies TextStyle,
  sleepDate:    { ...(typography.caption as TextStyle), color: colors.ink3, marginTop: 2 } satisfies TextStyle,

  // Leaderboard sheet
  lbSheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  } satisfies ViewStyle,
  lbSheetTitle: {
    ...(typography.subheading as TextStyle),
    flex: 1,
  } satisfies TextStyle,
  lbSheetSub: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  } satisfies TextStyle,
  lbScroll: { flex: 1 } satisfies ViewStyle,
  lbEmpty: {
    ...(typography.caption as TextStyle),
    color: colors.ink4,
    textAlign: 'center',
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  } satisfies TextStyle,
  lbDash: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSunk,
    marginVertical: spacing.xs,
  } satisfies ViewStyle,
});

const mgStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm } satisfies ViewStyle,
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceSunk } satisfies ViewStyle,
  icon: {
    width: 34, height: 34, borderRadius: radius.input,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  } satisfies ViewStyle,
  iconText: { ...(typography.label as TextStyle), color: colors.ink3, fontSize: 10 } satisfies TextStyle,
  content:  { flex: 1 } satisfies ViewStyle,
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 } satisfies ViewStyle,
  name:     { ...(typography.body as TextStyle), fontWeight: '500' } satisfies TextStyle,
  score:    { ...(typography.subheading as TextStyle), fontSize: 14 } satisfies TextStyle,
  track:    { height: 4, backgroundColor: colors.surfaceSunk, borderRadius: radius.pill, overflow: 'hidden' } satisfies ViewStyle,
  fill:     { height: 4, borderRadius: radius.pill } satisfies ViewStyle,
});

const insightStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm } satisfies ViewStyle,
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceSunk } satisfies ViewStyle,
  iconWrap: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } satisfies ViewStyle,
  msg: { ...(typography.caption as TextStyle), color: colors.ink1, flex: 1, lineHeight: 18 } satisfies TextStyle,
});

// ─── Leaderboard row ──────────────────────────────────────────────────────────

const MEDAL_COLORS = ['#C9A84C', '#9BA9B4', '#A0623A'];
const MEDAL_LABELS = ['1st', '2nd', '3rd'];

function LeaderboardRow({ entry, showDivider }: { entry: LeaderboardEntry; showDivider: boolean }) {
  const isTop3 = entry.rank <= 3;
  const medalColor = isTop3 ? MEDAL_COLORS[entry.rank - 1] : colors.ink3;
  const rowBg = entry.isCurrentUser ? colors.accent + '12' : 'transparent';
  return (
    <View style={[lbRowStyles.row, { backgroundColor: rowBg }, showDivider && lbRowStyles.divider]}>
      <View style={lbRowStyles.rankWrap}>
        {isTop3
          ? <Text style={[lbRowStyles.medal, { color: medalColor }]}>{MEDAL_LABELS[entry.rank - 1]}</Text>
          : <Text style={[lbRowStyles.rankNum, numericStyle]}>#{entry.rank}</Text>}
      </View>
      <Text style={[lbRowStyles.name, entry.isCurrentUser && lbRowStyles.nameSelf]} numberOfLines={1}>
        {entry.displayName}{entry.isCurrentUser ? ' (you)' : ''}
      </Text>
      <View style={lbRowStyles.streakWrap}>
        <Flame size={14} color={entry.currentStreak > 0 ? '#E8612A' : colors.ink4} strokeWidth={1.75} />
        <Text style={[lbRowStyles.streakVal, numericStyle, { color: entry.currentStreak > 0 ? colors.ink1 : colors.ink4 }]}>
          {entry.currentStreak}
        </Text>
      </View>
    </View>
  );
}

const lbRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  } satisfies ViewStyle,
  divider: { borderTopWidth: 1, borderTopColor: colors.divider } satisfies ViewStyle,
  rankWrap: { width: 36, alignItems: 'center' } satisfies ViewStyle,
  medal: { ...(typography.label as TextStyle), fontWeight: '700', fontSize: 12 } satisfies TextStyle,
  rankNum: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  name: { flex: 1, ...(typography.bodyMedium as TextStyle), color: colors.ink1 } satisfies TextStyle,
  nameSelf: { color: colors.accent } satisfies TextStyle,
  streakWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 } satisfies ViewStyle,
  streakVal: { ...(typography.bodyMedium as TextStyle), fontSize: 14 } satisfies TextStyle,
});

const skStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md } satisfies ViewStyle,
  iconWrap: { width: 36, height: 36, borderRadius: radius.input, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } satisfies ViewStyle,
  info:     { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs } satisfies ViewStyle,
  count:    { ...(typography.subheading as TextStyle), fontSize: 20 } satisfies TextStyle,
  label:    { ...(typography.caption as TextStyle) } satisfies TextStyle,
  best:     { alignItems: 'flex-end' } satisfies ViewStyle,
  bestLabel: { ...(typography.label as TextStyle), color: colors.ink3 } satisfies TextStyle,
  bestVal:  { ...(typography.bodyMedium as TextStyle), color: colors.ink2 } satisfies TextStyle,
});
