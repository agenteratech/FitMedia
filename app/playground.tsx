import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Dumbbell, Timer, Search, SlidersHorizontal } from 'lucide-react-native';
import {
  Card,
  Button,
  Chip,
  Input,
  SegmentedControl,
  DayPill,
  WeekStrip,
  TimerIsland,
  ExerciseThumbnail,
  SetRow,
  ExerciseCard,
  RoutineCard,
  useSnackBar,
} from '../src/components/primitives';
import { colors, spacing, typography, numericStyle } from '../src/theme';

export default function Playground() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={typography.display}>Playground</Text>
        <Text style={[typography.caption, { marginTop: spacing.xs }]}>
          Visual smoke test — every primitive must match the Stitch designs
        </Text>

        {/* ── Typography ── */}
        <Section title="Typography">
          <Text style={typography.displayXl}>76</Text>
          <Text style={typography.display}>Today's Session</Text>
          <Text style={typography.heading}>Routines</Text>
          <Text style={typography.subheading}>Bench Press (Barbell)</Text>
          <Text style={typography.body}>Body text used everywhere.</Text>
          <Text style={typography.bodyMedium}>Body-medium weight.</Text>
          <Text style={typography.caption}>11:32 PM → 6:56 AM</Text>
          <Text style={typography.label}>WORKOUT</Text>
          <Text style={[typography.heading, numericStyle]}>3,240 kg · 14 sets</Text>
        </Section>

        {/* ── Cards ── */}
        <Section title="Cards">
          <Card>
            <Text style={typography.subheading}>Default (20px pad)</Text>
            <Text style={[typography.caption, { marginTop: spacing.xs }]}>
              White surface, 20px radius, 1px border, no shadow.
            </Text>
          </Card>
          <Spacer />
          <Card padding="comfortable">
            <Text style={typography.label}>BODY SCORE</Text>
            <Text style={[typography.displayXl, { marginTop: spacing.sm }]}>76</Text>
            <Text style={[typography.caption, { marginTop: spacing.xs }]}>Strong</Text>
          </Card>
          <Spacer />
          <Card padding="compact">
            <Text style={typography.bodyMedium}>Compact (16px pad)</Text>
          </Card>
        </Section>

        {/* ── Buttons ── */}
        <Section title="Buttons — primary">
          <Button label="Start Workout" icon={Dumbbell} fullWidth onPress={() => {}} />
          <Spacer />
          <Button label="Save" fullWidth onPress={() => {}} />
          <Spacer />
          <Button label="Disabled" fullWidth disabled onPress={() => {}} />
        </Section>

        <Section title="Buttons — secondary & ghost">
          <Button label="Log freestyle workout" variant="secondary" fullWidth onPress={() => {}} />
          <Spacer />
          <Button label="Cancel" variant="ghost" onPress={() => {}} />
        </Section>

        <Section title="Buttons — compact">
          <View style={styles.row}>
            <Button label="Save" size="compact" onPress={() => {}} />
            <View style={{ width: spacing.sm }} />
            <Button label="Cancel" size="compact" variant="ghost" onPress={() => {}} />
            <View style={{ width: spacing.sm }} />
            <Button label="Add" size="compact" variant="secondary" icon={Plus} onPress={() => {}} />
          </View>
        </Section>

        {/* ── Chips ── */}
        <Section title="Chips — filter row">
          <View style={styles.chipRow}>
            <Chip label="All" selected onPress={() => {}} />
            <Chip label="Push" onPress={() => {}} />
            <Chip label="Pull" onPress={() => {}} />
            <Chip label="Legs" onPress={() => {}} />
            <Chip label="Upper" onPress={() => {}} />
          </View>
        </Section>

        <Section title="Chips — with icons">
          <View style={styles.chipRow}>
            <Chip label="5 exercises" icon={Dumbbell} />
            <Chip label="≈ 45 min" icon={Timer} />
            <Chip label="Filters" icon={SlidersHorizontal} />
            <Chip label="Search" icon={Search} />
          </View>
        </Section>

        {/* ── Input ── */}
        <Section title="Input — floating label">
          <InputDemo />
        </Section>

        {/* ── SegmentedControl ── */}
        <Section title="SegmentedControl">
          <SegmentedDemo />
        </Section>

        {/* ── DayPill ── */}
        <Section title="DayPill — all states">
          <View style={styles.chipRow}>
            <DayPill date={new Date()} state="default" dots={[]} />
            <DayPill date={new Date()} state="today" dots={['workout']} />
            <DayPill date={new Date()} state="selected" dots={['workout', 'diet', 'sleep']} />
            <DayPill date={new Date()} state="default" dots={['diet', 'sleep']} />
          </View>
        </Section>

        {/* ── WeekStrip ── */}
        <Section title="WeekStrip">
          <View style={{ marginHorizontal: -spacing['2xl'] }}>
            <WeekStripDemo />
          </View>
        </Section>

        {/* ── ExerciseThumbnail ── */}
        <Section title="ExerciseThumbnail">
          <View style={styles.chipRow}>
            <ExerciseThumbnail />
            <ExerciseThumbnail variant="small" />
          </View>
        </Section>

        {/* ── SetRow ── */}
        <Section title="SetRow — states">
          <Card padding="none" style={{ overflow: 'hidden' }}>
            <SetRow
              setNumber={1} kg="80" reps="8"
              previous={{ kg: 75, reps: 10 }}
              isDone={false} isActive={false} isPR={false}
              showPrevious
              onChangeKg={() => {}} onChangeReps={() => {}} onToggleDone={() => {}}
            />
            <SetRow
              setNumber={2} kg="82.5" reps="6"
              isDone={false} isActive={true} isPR={false}
              showPrevious
              onChangeKg={() => {}} onChangeReps={() => {}} onToggleDone={() => {}}
            />
            <SetRow
              setNumber={3} kg="85" reps="5"
              isDone={true} isActive={false} isPR={false}
              showPrevious
              onChangeKg={() => {}} onChangeReps={() => {}} onToggleDone={() => {}}
            />
            <SetRow
              setNumber={4} kg="90" reps="3"
              isDone={true} isActive={false} isPR={true}
              showPrevious
              onChangeKg={() => {}} onChangeReps={() => {}} onToggleDone={() => {}}
            />
          </Card>
        </Section>

        {/* ── ExerciseCard ── */}
        <Section title="ExerciseCard">
          <ExerciseCardDemo />
        </Section>

        {/* ── RoutineCard ── */}
        <Section title="RoutineCard">
          <RoutineCard
            routine={{
              id: '1',
              name: 'Push Day A',
              exerciseNames: ['Bench Press', 'Incline DB Press', 'Shoulder Press', 'Tricep Pushdown'],
              estimatedMinutes: 55,
            }}
            onStart={() => {}}
            onMore={() => {}}
          />
        </Section>

        {/* ── SnackBar ── */}
        <Section title="SnackBar (tap button to trigger)">
          <SnackBarDemo />
        </Section>

        {/* ── TimerIsland ── */}
        <Section title="TimerIsland (tap to expand)">
          <TimerIslandDemo />
        </Section>

        <View style={{ height: spacing['4xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── local demos ───────────────────────────────────────────────────────────

function InputDemo() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('test@example.com');
  return (
    <View style={{ gap: spacing.md }}>
      <Input label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
      <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Input label="Password" value="" onChangeText={() => {}} secureTextEntry error="Password must be at least 8 characters" />
    </View>
  );
}

function SegmentedDemo() {
  const [tab, setTab] = useState<'workout' | 'diet' | 'sleep'>('workout');
  return (
    <SegmentedControl
      options={[
        { value: 'workout', label: 'Workout' },
        { value: 'diet', label: 'Diet' },
        { value: 'sleep', label: 'Sleep' },
      ] as const}
      value={tab}
      onChange={setTab}
    />
  );
}

function WeekStripDemo() {
  const [selected, setSelected] = useState(new Date());
  const today = new Date().toISOString().slice(0, 10);
  return (
    <WeekStrip
      selectedDate={selected}
      onSelectDate={setSelected}
      markers={{ [today]: ['workout', 'diet'] }}
    />
  );
}

function ExerciseCardDemo() {
  const [sets, setSets] = useState([
    { kg: '80', reps: '8', isDone: false, isActive: true, isPR: false, previous: { kg: 75, reps: 8 } },
    { kg: '80', reps: '8', isDone: false, isActive: false, isPR: false },
    { kg: '80', reps: '8', isDone: false, isActive: false, isPR: false },
  ]);
  return (
    <ExerciseCard
      exercise={{ id: '1', name: 'Bench Press (Barbell)', restSeconds: 120 }}
      sets={sets}
      showPrevious
      onAddSet={() => setSets((s) => [...s, { kg: '', reps: '', isDone: false, isActive: false, isPR: false }])}
      onUpdateSet={(i, patch) => setSets((s) => s.map((row, idx) => idx === i ? { ...row, ...patch } : row))}
      onRemoveSet={(i) => setSets((s) => s.filter((_, idx) => idx !== i))}
    />
  );
}

function SnackBarDemo() {
  const snack = useSnackBar();
  return (
    <View style={{ gap: spacing.sm }}>
      <Button label="Show snackbar" onPress={() => snack.show('Workout saved')} />
      <Button
        label="Show with action"
        variant="secondary"
        onPress={() => snack.show('Added to Breakfast', { actionLabel: 'Undo', onAction: () => {} })}
      />
    </View>
  );
}

function TimerIslandDemo() {
  const [paused, setPaused] = useState(false);
  return (
    <View style={{ height: 140, position: 'relative' }}>
      <TimerIsland
        timeRemaining={73}
        totalTime={120}
        exerciseLabel="Bench Press"
        setLabel="Set 2 of 3"
        isPaused={paused}
        onPause={() => setPaused((p) => !p)}
        onSkip={() => {}}
        onAddTime={() => {}}
      />
    </View>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[typography.label, { marginBottom: spacing.md }]}>{title}</Text>
      {children}
    </View>
  );
}

function Spacer() {
  return <View style={{ height: spacing.md }} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  section: { marginTop: spacing['3xl'] },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
