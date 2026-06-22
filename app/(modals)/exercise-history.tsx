import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, History, Sparkles, Award } from 'lucide-react-native';
import { useExerciseHistory, type ExerciseSession } from '../../hooks/useExerciseHistory';
import { Card } from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

const MAX_BARS = 12;

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Thousands separators without relying on Intl/Hermes locale support.
function grouped(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function setLine(session: ExerciseSession): string {
  return [...session.sets]
    .sort((a, b) => a.setNumber - b.setNumber)
    .map((s) => `${s.weightKg > 0 ? s.weightKg : '—'}×${s.reps}`)
    .join('  ·  ');
}

export default function ExerciseHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { exerciseId, name } = useLocalSearchParams<{ exerciseId?: string; name?: string }>();
  const { history, loading } = useExerciseHistory(exerciseId);

  const sessions = history?.sessions ?? [];

  // Oldest → newest, capped, for the trend chart.
  const chartSessions = useMemo(() => sessions.slice(0, MAX_BARS).reverse(), [sessions]);
  const maxVolume = useMemo(
    () => Math.max(1, ...chartSessions.map((s) => s.totalVolumeKg)),
    [chartSessions]
  );

  // Progressive-overload deltas: latest vs previous session, and latest vs first.
  const progress = useMemo(() => {
    if (sessions.length < 2) return null;
    const latest = sessions[0];
    const previous = sessions[1];
    const first = sessions[sessions.length - 1];
    return {
      weightVsPrev: latest.topWeightKg - previous.topWeightKg,
      volumeVsPrev: latest.totalVolumeKg - previous.totalVolumeKg,
      weightSinceFirst: latest.topWeightKg - first.topWeightKg,
    };
  }, [sessions]);

  // Narrative performance insights derived from the session history.
  const insights = useMemo(() => {
    if (sessions.length < 2) return [] as { id: string; icon: 'gain' | 'best' | 'pr'; message: string }[];
    const latest = sessions[0];
    const previous = sessions[1];
    const first = sessions[sessions.length - 1];
    const list: { id: string; icon: 'gain' | 'best' | 'pr'; message: string }[] = [];

    const weightGain = latest.topWeightKg - first.topWeightKg;
    if (weightGain > 0) {
      list.push({
        id: 'weight-since-first',
        icon: 'gain',
        message: `You've added ${+weightGain.toFixed(1)} kg to your top set since your first session (${formatShortDate(first.date)}).`,
      });
    }

    if (latest.sets.some((s) => s.isPr)) {
      list.push({ id: 'pr', icon: 'pr', message: 'You hit a personal record in your last session.' });
    }

    if ((history?.bestVolumeKg ?? 0) > 0 && latest.totalVolumeKg >= (history?.bestVolumeKg ?? 0)) {
      list.push({ id: 'best-volume', icon: 'best', message: 'Your last session was your best volume yet.' });
    }

    if (previous.totalVolumeKg > 0) {
      const pct = Math.round(((latest.totalVolumeKg - previous.totalVolumeKg) / previous.totalVolumeKg) * 100);
      if (pct >= 5) {
        list.push({ id: 'vol-up', icon: 'gain', message: `Session volume up ${pct}% vs your previous session.` });
      }
    }

    return list;
  }, [sessions, history]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ChevronLeft size={24} color={colors.ink2} strokeWidth={1.75} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{name ?? 'Exercise History'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.ink3} />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIcon}>
            <History size={28} color={colors.ink4} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptyText}>
            Log this exercise in a workout and your past sets will show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing['3xl'] }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary tiles */}
          <View style={styles.statGrid}>
            <StatTile label="Best set" value={`${history?.bestWeightKg ?? 0}`} unit="kg" />
            <StatTile label="Best volume" value={grouped(history?.bestVolumeKg ?? 0)} unit="kg" />
            <StatTile label="Sessions" value={String(history?.sessionCount ?? 0)} />
          </View>

          {/* Progressive overload callout */}
          {progress ? (
            <Card padding="default">
              <Text style={styles.sectionLabel}>PROGRESSIVE OVERLOAD</Text>
              <View style={styles.overloadRow}>
                <OverloadStat
                  label="vs last session"
                  delta={progress.weightVsPrev}
                  unit="kg"
                />
                <OverloadStat
                  label="volume vs last"
                  delta={Math.round(progress.volumeVsPrev)}
                  unit="kg"
                />
                <OverloadStat
                  label="since first"
                  delta={progress.weightSinceFirst}
                  unit="kg"
                />
              </View>
            </Card>
          ) : null}

          {/* Performance insights */}
          {insights.length > 0 ? (
            <Card padding="default">
              <Text style={styles.sectionLabel}>INSIGHTS</Text>
              <View style={{ gap: spacing.sm }}>
                {insights.map((it) => (
                  <View key={it.id} style={styles.insightRow}>
                    <View style={styles.insightIcon}>
                      {it.icon === 'pr' ? (
                        <Sparkles size={14} color={colors.accent} strokeWidth={2} />
                      ) : it.icon === 'best' ? (
                        <Award size={14} color={colors.accent} strokeWidth={2} />
                      ) : (
                        <TrendingUp size={14} color={colors.success} strokeWidth={2} />
                      )}
                    </View>
                    <Text style={styles.insightMsg}>{it.message}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Volume trend */}
          {chartSessions.length >= 2 ? (
            <Card padding="default">
              <Text style={styles.sectionLabel}>VOLUME TREND</Text>
              <View style={styles.chart}>
                {chartSessions.map((s) => {
                  const pct = Math.round((s.totalVolumeKg / maxVolume) * 100);
                  return (
                    <View key={s.workoutId} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${Math.max(4, pct)}%` }]} />
                      </View>
                      <Text style={styles.barLabel} numberOfLines={1}>{formatShortDate(s.date)}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          {/* Session list */}
          <Text style={styles.sectionLabel}>HISTORY</Text>
          {sessions.map((s) => (
            <Card key={s.workoutId} padding="default" style={styles.sessionCard}>
              <View style={styles.sessionTopRow}>
                <Text style={styles.sessionDate}>{formatShortDate(s.date)}</Text>
                <Text style={[styles.sessionTopSet, numericStyle]}>
                  {s.topWeightKg > 0 ? `${s.topWeightKg} kg × ${s.topReps}` : `${s.topReps} reps`}
                </Text>
              </View>
              <Text style={[styles.sessionSets, numericStyle]} numberOfLines={2}>{setLine(s)}</Text>
              <Text style={[styles.sessionVolume, numericStyle]}>
                {s.sets.length} set{s.sets.length !== 1 ? 's' : ''} · {grouped(s.totalVolumeKg)} kg volume
              </Text>
            </Card>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, numericStyle]}>{value}</Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function OverloadStat({ label, delta, unit }: { label: string; delta: number; unit: string }) {
  const up = delta > 0;
  const down = delta < 0;
  const color = up ? colors.success : down ? colors.alert : colors.ink3;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const sign = up ? '+' : '';
  return (
    <View style={styles.overloadStat}>
      <View style={styles.overloadValueRow}>
        <Icon size={14} color={color} strokeWidth={2} />
        <Text style={[styles.overloadValue, numericStyle, { color }]}>
          {delta === 0 ? '—' : `${sign}${delta}${unit}`}
        </Text>
      </View>
      <Text style={styles.overloadLabel}>{label}</Text>
    </View>
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
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  } satisfies ViewStyle,
  headerTitle: { ...(typography.subheading as TextStyle), flex: 1, textAlign: 'center' } satisfies TextStyle,
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing['2xl'],
  } satisfies ViewStyle,
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  emptyTitle: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  emptyText: { ...(typography.caption as TextStyle), color: colors.ink3, textAlign: 'center' } satisfies TextStyle,
  scroll: { flex: 1 } satisfies ViewStyle,
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    gap: spacing.lg,
  } satisfies ViewStyle,

  // Stat tiles
  statGrid: { flexDirection: 'row', gap: spacing.md } satisfies ViewStyle,
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.surfaceElevBorder,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  } satisfies ViewStyle,
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 } satisfies ViewStyle,
  statValue: { ...(typography.subheading as TextStyle) } satisfies TextStyle,
  statUnit: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  statLabel: { ...(typography.label as TextStyle), fontSize: 10, color: colors.ink3 } satisfies TextStyle,

  sectionLabel: { ...(typography.label as TextStyle), color: colors.ink3, marginBottom: spacing.md } satisfies TextStyle,

  // Overload callout
  overloadRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm } satisfies ViewStyle,
  overloadStat: { flex: 1, gap: spacing.xs } satisfies ViewStyle,
  overloadValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 } satisfies ViewStyle,
  overloadValue: { ...(typography.bodyMedium as TextStyle) } satisfies TextStyle,
  overloadLabel: { ...(typography.label as TextStyle), fontSize: 10, color: colors.ink3 } satisfies TextStyle,

  // Insights
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md } satisfies ViewStyle,
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies ViewStyle,
  insightMsg: { ...(typography.caption as TextStyle), color: colors.ink1, flex: 1 } satisfies TextStyle,

  // Volume trend chart
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: spacing.xs,
  } satisfies ViewStyle,
  barCol: { flex: 1, alignItems: 'center', gap: spacing.xs } satisfies ViewStyle,
  barTrack: {
    width: '100%',
    height: 92,
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceSunk,
    borderRadius: radius.sheetBottom,
    overflow: 'hidden',
  } satisfies ViewStyle,
  barFill: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.sheetBottom,
  } satisfies ViewStyle,
  barLabel: { ...(typography.label as TextStyle), fontSize: 9, color: colors.ink3 } satisfies TextStyle,

  // Session list
  sessionCard: { gap: spacing.xs } satisfies ViewStyle,
  sessionTopRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' } satisfies ViewStyle,
  sessionDate: { ...(typography.bodyMedium as TextStyle), color: colors.ink2 } satisfies TextStyle,
  sessionTopSet: { ...(typography.subheading as TextStyle), color: colors.ink1 } satisfies TextStyle,
  sessionSets: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
  sessionVolume: { ...(typography.caption as TextStyle), color: colors.ink3 } satisfies TextStyle,
});
