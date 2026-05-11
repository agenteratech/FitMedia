import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Polyline,
  Stop,
} from 'react-native-svg';
import { Dumbbell, Moon, Minus, TrendingDown, TrendingUp, Trophy, Zap } from 'lucide-react-native';
import { useDailyScore } from '../../hooks/useDailyScore';
import { useBodyPartScores } from '../../hooks/useBodyPartScores';
import { useScoreHistory, sinceForRange, type ScorePoint, type ScoreRange } from '../../hooks/useScoreHistory';
import { useProgressStats } from '../../hooks/useProgressStats';
import { Card, Chip } from '../../src/components/primitives';
import { colors, spacing, typography, numericStyle, radius } from '../../src/theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const RANGES: ScoreRange[] = ['Week', 'Month', '3 Months', 'Year'];

// Horizontal padding: scroll (24) + card comfortable (24) × 2 sides = 96
const CHART_H_OFFSET = (spacing['2xl'] + spacing['2xl']) * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// For 0–100 daily performance scores (workout / diet / sleep)
function fillColor(value: number): string {
  if (value >= 60) return colors.success;
  if (value >= 35) return colors.accent;
  return colors.alert;
}

// For body-part scores on the unbounded power-law scale
function bodyFillColor(value: number): string {
  if (value >= 80) return colors.success;
  if (value >= 40) return colors.accent;
  return colors.alert;
}

// Bar reference for body-part bars: 250 pts = full bar
const BODY_BAR_MAX = 250;

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
}

function formatChartDate(dateStr: string, range: ScoreRange): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (range === 'Week') return d.toLocaleDateString(undefined, { weekday: 'short' });
  if (range === 'Month') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function rangePeriodLabel(range: ScoreRange): string {
  if (range === 'Week') return 'This week';
  if (range === 'Month') return 'This month';
  if (range === '3 Months') return 'Past 3 months';
  return 'This year';
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const [range, setRange] = useState<ScoreRange>('Week');
  const { score } = useDailyScore();
  const bodyParts = useBodyPartScores(score);
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();

  const { points, trend, loading: histLoading } = useScoreHistory(range);
  const since = useMemo(() => sinceForRange(range), [range]);
  const { stats, loading: statsLoading } = useProgressStats(since);

  const chartWidth = screenW - CHART_H_OFFSET;
  const totalScore = score?.total_score ?? null;
  const periodLabel = rangePeriodLabel(range);

  const bodyPartRows = [
    { label: 'Push',   value: bodyParts.chest },
    { label: 'Pull',   value: bodyParts.back },
    { label: 'Legs',   value: bodyParts.legs },
    { label: 'Core',   value: Math.round((bodyParts.arms + bodyParts.shoulders) / 2) },
    { label: 'Cardio', value: null as number | null },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={typography.heading}>Progress</Text>
          <TrendingUp size={22} color={colors.ink2} strokeWidth={1.75} />
        </View>

        {/* ── Range chips ── */}
        <View style={styles.chips}>
          {RANGES.map((r) => (
            <Chip key={r} label={r} selected={range === r} onPress={() => setRange(r)} />
          ))}
        </View>

        {/* ── Body Score hero card ── */}
        <Card padding="comfortable">
          <Text style={styles.cardLabel}>BODY SCORE</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.heroScore, numericStyle]}>
              {totalScore !== null ? totalScore : '—'}
            </Text>
            <TrendBadge trend={trend} />
          </View>
          <Text style={styles.periodCaption}>{periodLabel}</Text>

          <View style={styles.chartWrap}>
            {histLoading ? (
              <View style={styles.chartLoader}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : (
              <ScoreAreaChart points={points} width={chartWidth} />
            )}
            {!histLoading && points.length >= 2 && (
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabelText}>
                  {formatChartDate(points[0].date, range)}
                </Text>
                <Text style={styles.chartLabelText}>
                  {formatChartDate(points[points.length - 1].date, range)}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* ── Period stats ── */}
        <SectionHeader label={periodLabel} />
        <View style={styles.statsRow}>
          <StatCard
            icon={<Dumbbell size={18} color={colors.ink2} strokeWidth={1.75} />}
            value={statsLoading ? '—' : String(stats.sessions)}
            label="Sessions"
          />
          <StatCard
            icon={<Zap size={18} color={colors.ink2} strokeWidth={1.75} />}
            value={statsLoading ? '—' : formatVolume(stats.totalVolumeKg)}
            label="Volume"
          />
          <StatCard
            icon={<Trophy size={18} color={colors.ink2} strokeWidth={1.75} />}
            value={statsLoading ? '—' : String(stats.prCount)}
            label="PRs Set"
          />
        </View>

        {/* ── Today's score breakdown ── */}
        {score && (
          <>
            <SectionHeader label="Today's Scores" />
            <Card padding="default">
              <ScoreRow label="Workout" value={score.workout_score ?? null} />
              <View style={styles.divider} />
              <ScoreRow label="Diet" value={score.diet_score ?? null} />
              <View style={styles.divider} />
              <ScoreRow label="Sleep" value={score.sleep_score ?? null} />
            </Card>
          </>
        )}

        {/* ── Body part breakdown ── */}
        <SectionHeader label="By Body Part" />
        <Card padding="default">
          <View style={styles.barsWrap}>
            {bodyPartRows.map((row) => (
              <BodyPartBar key={row.label} label={row.label} value={row.value} />
            ))}
          </View>
        </Card>

        {/* ── Sleep summary ── */}
        {stats.avgSleepHours !== null && (
          <>
            <SectionHeader label="Sleep" />
            <Card padding="default">
              <View style={styles.sleepRow}>
                <Moon size={20} color={colors.ink3} strokeWidth={1.75} />
                <View style={styles.sleepInfo}>
                  <Text style={[styles.sleepHours, numericStyle]}>
                    {stats.avgSleepHours.toFixed(1)}h avg / night
                  </Text>
                  <Text style={styles.sleepCaption}>
                    {stats.sleepNights} night{stats.sleepNights !== 1 ? 's' : ''} logged
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}

        {/* ── Insights ── */}
        {score?.insights && score.insights.length > 0 && (
          <>
            <SectionHeader label="Insights" />
            <Card padding="default">
              {score.insights.map((insight, i) => (
                <View key={i} style={[styles.insightRow, i > 0 && styles.insightBorder]}>
                  <Text style={styles.insightType}>{insight.type.toUpperCase()}</Text>
                  <Text style={styles.insightMsg}>{insight.message}</Text>
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

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  const isUp = trend > 0;
  const isFlat = trend === 0;
  const clr = isFlat ? colors.ink3 : isUp ? colors.success : colors.alert;
  const bg = isFlat ? colors.surfaceSunk : isUp ? colors.successSoft : '#F6DDD9';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {isFlat
        ? <Minus size={11} color={clr} strokeWidth={2.5} />
        : isUp
        ? <TrendingUp size={11} color={clr} strokeWidth={2.5} />
        : <TrendingDown size={11} color={clr} strokeWidth={2.5} />}
      <Text style={[styles.badgeText, { color: clr }]}>
        {isFlat ? 'Stable' : `${isUp ? '+' : ''}${trend}`}
      </Text>
    </View>
  );
}

function ScoreAreaChart({ points, width }: { points: ScorePoint[]; width: number }) {
  const H = 100;
  const padV = 10;
  const plotH = H - padV * 2;

  if (points.length < 2) {
    return (
      <View style={[styles.chartLoader, { height: H }]}>
        <Text style={styles.chartEmpty}>No data logged this period</Text>
      </View>
    );
  }

  const scores = points.map((p) => p.total_score);
  const lo = Math.max(0, Math.min(...scores) - 15);
  const hi = Math.max(...scores) + 15;
  const span = hi - lo || 1;

  const toX = (i: number) => (i / (points.length - 1)) * width;
  const toY = (s: number) => padV + (1 - (s - lo) / span) * plotH;

  const pts = points.map((p, i) => ({ x: toX(i), y: toY(p.total_score) }));
  const lineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const bottomY = padV + plotH;

  const areaD = [
    `M${pts[0].x.toFixed(1)},${bottomY}`,
    `L${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`,
    ...pts.slice(1).map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L${pts[pts.length - 1].x.toFixed(1)},${bottomY}`,
    'Z',
  ].join(' ');

  const last = pts[pts.length - 1];

  return (
    <Svg width={width} height={H}>
      <Defs>
        <LinearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.22" />
          <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {/* Mid grid line */}
      <Line
        x1="0" y1={padV + plotH * 0.5}
        x2={width} y2={padV + plotH * 0.5}
        stroke={colors.divider} strokeWidth="1"
        strokeDasharray="4 4"
      />
      {/* Area fill */}
      <Path d={areaD} fill="url(#scoreAreaGrad)" />
      {/* Line */}
      <Polyline
        points={lineStr}
        fill="none"
        stroke={colors.accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest point dot */}
      <Circle cx={last.x} cy={last.y} r={4} fill={colors.surface} />
      <Circle cx={last.x} cy={last.y} r={3} fill={colors.accent} />
    </Svg>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <Card padding="compact" style={styles.statCard}>
      {icon}
      <Text style={[styles.statValue, numericStyle]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function ScoreRow({ label, value }: { label: string; value: number | null }) {
  const pct = value !== null ? Math.min(Math.max(value, 0), 100) : 0;
  const barColor = value !== null ? fillColor(value) : colors.surfaceSunk;
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreRowLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.scoreRowVal, numericStyle]}>
        {value !== null ? value : '—'}
      </Text>
    </View>
  );
}

function BodyPartBar({ label, value }: { label: string; value: number | null }) {
  const pct = value !== null ? Math.min((Math.max(value, 0) / BODY_BAR_MAX) * 100, 100) : 0;
  const barColor = value !== null ? bodyFillColor(value) : colors.surfaceSunk;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label}>{label}</Text>
      <View style={barStyles.track}>
        <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[barStyles.val, numericStyle]}>
        {value !== null ? value : '—'}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg } satisfies ViewStyle,
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.md,
  } satisfies ViewStyle,

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  } satisfies ViewStyle,

  chips: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' } satisfies ViewStyle,

  // Hero card
  cardLabel: {
    ...(typography.label as TextStyle),
    marginBottom: spacing.sm,
  } satisfies TextStyle,
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  } satisfies ViewStyle,
  heroScore: { ...(typography.displayXl as TextStyle) } satisfies TextStyle,
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  badgeText: {
    ...(typography.label as TextStyle),
    fontSize: 11,
  } satisfies TextStyle,
  periodCaption: {
    ...(typography.caption as TextStyle),
    color: colors.ink3,
    marginBottom: spacing.lg,
  } satisfies TextStyle,

  // Chart
  chartWrap: { gap: spacing.xs } satisfies ViewStyle,
  chartLoader: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  } satisfies ViewStyle,
  chartEmpty: {
    ...(typography.caption as TextStyle),
    color: colors.ink4,
  } satisfies TextStyle,
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } satisfies ViewStyle,
  chartLabelText: {
    ...(typography.label as TextStyle),
    color: colors.ink4,
    fontSize: 10,
  } satisfies TextStyle,

  // Section header
  sectionHeader: {
    ...(typography.subheading as TextStyle),
    marginTop: spacing.xs,
  } satisfies TextStyle,

  // Stats row
  statsRow: { flexDirection: 'row', gap: spacing.sm } satisfies ViewStyle,
  statCard: { flex: 1, alignItems: 'center', gap: spacing.xs } satisfies ViewStyle,
  statValue: {
    ...(typography.subheading as TextStyle),
    fontSize: 20,
  } satisfies TextStyle,
  statLabel: {
    ...(typography.label as TextStyle),
    color: colors.ink3,
  } satisfies TextStyle,

  // Score breakdown
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  } satisfies ViewStyle,
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } satisfies ViewStyle,
  scoreRowLabel: {
    ...(typography.bodyMedium as TextStyle),
    width: 64,
    color: colors.ink2,
    fontSize: 14,
  } satisfies TextStyle,
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    overflow: 'hidden',
  } satisfies ViewStyle,
  barFill: {
    height: 8,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  scoreRowVal: {
    ...(typography.bodyMedium as TextStyle),
    width: 28,
    textAlign: 'right',
    color: colors.ink2,
    fontSize: 14,
  } satisfies TextStyle,

  // Body part bars
  barsWrap: { gap: spacing.md } satisfies ViewStyle,

  // Sleep
  sleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  } satisfies ViewStyle,
  sleepInfo: { flex: 1 } satisfies ViewStyle,
  sleepHours: {
    ...(typography.subheading as TextStyle),
  } satisfies TextStyle,
  sleepCaption: {
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
    gap: spacing.md,
  } satisfies ViewStyle,
  label: {
    ...(typography.bodyMedium as TextStyle),
    width: 52,
    color: colors.ink2,
    fontSize: 14,
  } satisfies TextStyle,
  track: {
    flex: 1,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunk,
    overflow: 'hidden',
  } satisfies ViewStyle,
  fill: {
    height: 8,
    borderRadius: radius.pill,
  } satisfies ViewStyle,
  val: {
    ...(typography.bodyMedium as TextStyle),
    width: 44,
    textAlign: 'right',
    color: colors.ink2,
    fontSize: 14,
  } satisfies TextStyle,
});
