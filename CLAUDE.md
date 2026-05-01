# FitMedia — Technical Reference

Complete technical documentation for the FitMedia codebase. Read this before making any changes.

---

## 1. Project Overview

FitMedia is a fitness RPG tracking app built with Expo (React Native). Users log workouts, diet, and sleep; a scoring engine converts activity into 0–100 scores per category (Workout, Diet, Sleep) and a composite "Body Score." The app tracks progress over time with charts, per-muscle-group breakdowns, and insights.

**Stack summary:** Expo 54 · React Native 0.81 · React 19 · Expo Router v4 (file-based) · Supabase (Postgres + Auth) · Zustand v5 · MMKV · @gorhom/bottom-sheet v5 · react-native-svg · react-native-reanimated v4

---

## 2. Directory Structure

```
c:\fitmedia\
├── app/
│   ├── _layout.tsx              # Root layout: providers + auth gate + font gate
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar layout (5 tabs + FloatingTabBar)
│   │   ├── home.tsx             # Dashboard
│   │   ├── logs.tsx             # Workout / Diet / Sleep logs
│   │   ├── routines.tsx         # Routine library
│   │   ├── progress.tsx         # Progress analytics
│   │   └── profile.tsx          # User profile & stats editor
│   ├── (modals)/
│   │   ├── active-workout.tsx   # In-progress workout screen
│   │   ├── finish-workout.tsx   # Post-workout summary
│   │   ├── create-routine.tsx   # Routine builder
│   │   └── exercise-picker.tsx  # Exercise search/select
│   ├── auth/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── onboarding/
│       ├── basic-info.tsx
│       ├── fitness-level.tsx
│       ├── goal-lifestyle.tsx
│       ├── strength-test.tsx
│       └── character-reveal.tsx
├── src/
│   └── components/
│       └── primitives/          # Reusable UI atoms
│           ├── Sheet.tsx
│           ├── Button.tsx
│           ├── Card.tsx
│           ├── Input.tsx
│           ├── SegmentedControl.tsx
│           ├── Chip.tsx
│           ├── WeekStrip.tsx
│           ├── RoutineCard.tsx
│           ├── ExerciseCard.tsx
│           ├── SetRow.tsx
│           ├── ExerciseThumbnail.tsx
│           ├── FloatingTabBar.tsx
│           ├── TimerIsland.tsx
│           ├── DayPill.tsx
│           └── SnackBar.tsx
├── hooks/
│   ├── useDailyScore.ts
│   ├── useWorkoutHistory.ts
│   ├── useDietLogs.ts
│   ├── useSleepLogs.ts
│   ├── useRoutines.ts
│   ├── useExercises.ts
│   ├── useBodyPartScores.ts
│   ├── useAutoFill.ts
│   ├── usePRDetection.ts
│   ├── useScoreHistory.ts
│   └── useProgressStats.ts
├── stores/
│   ├── authStore.ts
│   ├── workoutStore.ts
│   ├── routineStore.ts
│   └── exerciseStore.ts
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── storage.ts               # MMKV wrapper
│   └── fatsecret/
│       └── client.ts            # FatSecret food API client
├── constants/
│   └── colors.ts                # Color palette
├── theme/
│   ├── spacing.ts
│   ├── radius.ts
│   ├── typography.ts
│   ├── fonts.ts
│   └── shadows.ts
├── types/
│   └── database.ts              # Supabase generated types
├── .env                         # Environment variables (never commit)
├── app.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## 3. Design System

**Rule:** Never use raw color hex values, px numbers, or inline font definitions. Always reference theme tokens.

### 3.1 Colors — `constants/colors.ts`

| Token | Value | Usage |
|---|---|---|
| `colors.bg` | `#F4F1EC` | Screen backgrounds |
| `colors.surface` | `#FFFFFF` | Cards, sheets |
| `colors.surfaceSunk` | `#EDE9E3` | Recessed inputs |
| `colors.surfaceElevBorder` | `#E8E4DC` | Card borders |
| `colors.ink1` | `#1A1714` | Primary text |
| `colors.ink2` | `#4A4540` | Secondary text |
| `colors.ink3` | `#8A837A` | Placeholder, labels |
| `colors.ink4` | `#C4BDB6` | Disabled |
| `colors.accent` | `#D9663F` | Primary CTA, highlights |
| `colors.success` | `#4F7A5A` | Positive states (≥60 scores) |
| `colors.alert` | `#A4513C` | Errors, low scores (<35) |
| `colors.scrim` | `rgba(26,23,20,0.5)` | Modal backdrop |

Score color helper pattern used across screens:
```typescript
const scoreColor = (v: number) => v >= 60 ? colors.success : v >= 35 ? colors.accent : colors.alert;
const scoreBg    = (v: number) => scoreColor(v) + '18'; // 10% opacity tint
```

### 3.2 Spacing — `theme/spacing.ts`

4px base grid:

| Token | px |
|---|---|
| `spacing.xs` | 4 |
| `spacing.sm` | 8 |
| `spacing.md` | 12 |
| `spacing.lg` | 16 |
| `spacing.xl` | 20 |
| `spacing['2xl']` | 24 |
| `spacing['3xl']` | 32 |
| `spacing['4xl']` | 48 |
| `spacing['5xl']` | 64 |

### 3.3 Radius — `theme/radius.ts`

| Token | px | Used for |
|---|---|---|
| `radius.buttonCompact` | 14 | Small buttons |
| `radius.input` | 16 | Inputs, small cards |
| `radius.button` | 18 | Default buttons |
| `radius.card` | 20 | Cards |
| `radius.modal` | 24 | Modal corners |
| `radius.sheet` | 28 | Bottom sheet top corners |
| `radius.sheetBottom` | 12 | Inside sheet bottom |
| `radius.timer` | 32 | Timer island |
| `radius.pill` | 999 | Pills/chips |

### 3.4 Typography — `theme/typography.ts`

Inter font family (loaded via `useFitmediaFonts()` from `theme/fonts.ts`).

| Token | Size | Weight | Line-height |
|---|---|---|---|
| `typography.displayXl` | 36 | 700 | 44 |
| `typography.display` | 30 | 700 | 38 |
| `typography.heading` | 22 | 600 | 30 |
| `typography.subheading` | 17 | 600 | 24 |
| `typography.body` | 15 | 400 | 22 |
| `typography.bodyMedium` | 15 | 500 | 22 |
| `typography.caption` | 13 | 400 | 18 |
| `typography.label` | 11 | 500 | 16 |

Use `typography.numericStyle` (`{ fontVariant: ['tabular-nums'] }`) on all number displays.

### 3.5 Shadows — `theme/shadows.ts`

`shadows.card` — standard drop shadow for elevated cards.

---

## 4. Navigation Architecture

Expo Router v4 file-based routing. The scheme is `fitnessrpg://`.

### Route tree

```
/                         → redirect based on auth state
/(tabs)/home              → Dashboard
/(tabs)/logs              → Workout/Diet/Sleep logs
/(tabs)/routines          → Routine library
/(tabs)/progress          → Progress analytics
/(tabs)/profile           → Profile editor
/(modals)/active-workout  → params: mode=freestyle|routine, routineId?
/(modals)/finish-workout  → params: workoutId, duration, totalVolumeKg
/(modals)/create-routine  → Routine builder
/(modals)/exercise-picker → params: routineId (for adding to routine)
/auth/login
/auth/signup
/onboarding/basic-info
/onboarding/fitness-level
/onboarding/goal-lifestyle
/onboarding/strength-test
/onboarding/character-reveal
```

### Auth gate (app/_layout.tsx)

```
Fonts loaded?
  └─ No → splash / nothing rendered
  └─ Yes → authStore.init() called once
            ├─ No session → /auth/login
            ├─ Session, onboarding incomplete → /onboarding/basic-info
            └─ Session, onboarding complete → /(tabs)/home
```

### Provider stack (app/_layout.tsx)

```tsx
<GestureHandlerRootView>
  <SafeAreaProvider>
    <BottomSheetModalProvider>
      <SnackBarProvider>
        <Stack>...</Stack>
      </SnackBarProvider>
    </BottomSheetModalProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

`BottomSheetModalProvider` **must** be here — inside `GestureHandlerRootView` — for all `Sheet` components to work.

---

## 5. Screens

### 5.1 Home (`app/(tabs)/home.tsx`)

Data sources: `useDailyScore`, `useBodyPartScores`, `useWorkoutHistory`, `useSleepLogs`, `useDietLogs`, `useRoutines`

Layout (scroll):
- **Header** — greeting (time of day) + today's date
- **Body Score ring** — animated SVG ring using `Animated.createAnimatedComponent(Circle)`, `useNativeDriver: false` (SVG can't use native driver), 1100ms ease-in-out, 250ms delay
  - Ring constants: `RING_SIZE=136`, `RING_STROKE=11`, `RING_R=(136-11)/2`, `RING_CIRC=2π×RING_R`
  - `strokeDashoffset` animates from `RING_CIRC` (empty) to `RING_CIRC * (1 - score/100)`
- **Body part chips** — horizontal scroll, 5 muscle groups, color-coded
- **Today's sub-scores** — Workout / Diet / Sleep rows with colored bars
- **Quick actions** — Log Workout, Log Food, Log Sleep
- **Up Next** — first routine in library; start button wires into `workoutStore` then navigates to `/(modals)/active-workout?mode=routine&routineId=...`
- **Recent activity** — last 3 workouts from `useWorkoutHistory`
- **Today's nutrition** — calorie count + macro pills from `useDietLogs(today)`
- **Last night's sleep** — duration + quality from `useSleepLogs`
- **Insights** — text fields from `daily_scores.insights`

### 5.2 Logs (`app/(tabs)/logs.tsx`)

**Segments:** Workout | Diet | Sleep (via `SegmentedControl`)

**Workout segment:**
- Week summary: sessions this week, total volume
- Session list: each session shows exercises, total volume, duration
- Empty state buttons:
  - "Start a Routine" → `router.push('/(tabs)/routines')`
  - "Log freestyle workout" → `router.push('/(modals)/active-workout?mode=freestyle')`

**Diet segment:**
- Date navigator (WeekStrip or calendar modal)
- Calorie ring: target 2400 kcal, consumed shown in center
- Macro breakdown (Protein/Carbs/Fat) as colored bars
- Meal sections: breakfast / lunch / dinner / snack
- Add food button per meal → opens `AddFoodSheet`
- `AddFoodSheet`: always-mounted with `visible` prop; search debounced 300ms via FatSecret API; tap result to see detail with weight slider; Save logs to `diet_logs`
- Manual entry fallback when no results

**Sleep segment:**
- 7-day bar chart
- Quality indicator
- Recent log list (last 14 days from `useSleepLogs`)
- Log Sleep button → opens `LogSleepSheet`
- `LogSleepSheet`: always-mounted with `visible` prop; hours slider (0–12h step 0.5); quality chips (Poor/Fair/Good/Excellent); Save inserts to `sleep_logs`

**Sheet pattern:** Both `AddFoodSheet` and `LogSleepSheet` are always-mounted in the render tree with a `visible` boolean prop. The `Sheet` primitive calls `ref.current?.present()` / `ref.current?.dismiss()` imperatively. Do **not** conditionally render them (`{condition && <Sheet>}`) — that breaks the animation lifecycle.

### 5.3 Routines (`app/(tabs)/routines.tsx`)

- Filter chips: All / Push / Pull / Legs / Upper / Lower / Full Body
- Filtering is client-side by matching exercise `primary_muscles` against keyword sets
- `RoutineCard` per routine: name, exercise list, "Start" button
- Start routine: resets `workoutStore`, populates exercises from routine, navigates to `/(modals)/active-workout?mode=routine&routineId=...`
- Long press / options button → opens `Sheet` with Delete action
- Create routine → `/(modals)/create-routine`

### 5.4 Progress (`app/(tabs)/progress.tsx`)

Data sources: `useScoreHistory(range)`, `useProgressStats(since)`, `useDailyScore`, `useBodyPartScores`, `useSleepLogs`

- Range selector: Week | Month | 3 Months | Year
- **Body Score hero card** — current score + `TrendBadge` (↑ Up / ↓ Down / Stable)
  - Trend = avg of second half of points minus avg of first half (null if < 4 points)
- **Area chart** — SVG: gradient fill, polyline, white-bordered dot at latest point
  - Y axis: dynamic range (min score − 5, max score + 5), clamped 0–100
  - Chart width = `windowWidth - CHART_H_OFFSET` where `CHART_H_OFFSET = (spacing['2xl'] + spacing['2xl']) * 2`
  - Empty state shown when `points.length < 2`
- **Period stats** — Sessions / Total Volume / PRs from `useProgressStats`
- **Score breakdown** — Workout / Diet / Sleep bars with `fillColor` helper
- **Body part bars** — 5 muscle groups, color-coded
- **Sleep summary** — avg hours, nights tracked
- **Insights** — from `daily_scores.insights`

### 5.5 Profile (`app/(tabs)/profile.tsx`)

- Email display (read-only, from `authStore.user.email`)
- Editable fields: Name, Height (50–300 cm), Weight (20–500 kg), Age (1–120)
- Fitness level: Beginner / Intermediate / Advanced (chip selector)
- Goal: Bulk / Maintain / Cut (chip selector)
- Lifestyle: Gender, Avg Sleep Hours, Diet Consistency
- Save → updates `users` table in Supabase, shows success/error feedback

---

## 6. Modals

### active-workout (`app/(modals)/active-workout.tsx`)

Params: `mode` (`freestyle` | `routine`), `routineId` (optional)

- `TimerIsland` floating above content showing elapsed time
- Exercise list from `workoutStore`
- Per-exercise: `SetRow` per set (weight, reps), add set button, PR badge if detected via `usePRDetection`
- `useAutoFill` pre-fills last used weight/reps for each exercise
- Finish → computes total volume, saves to `workouts` + `workout_exercises` + `workout_sets`, triggers score update, navigates to `/finish-workout`

### finish-workout (`app/(modals)/finish-workout.tsx`)

Params: `workoutId`, `duration`, `totalVolumeKg`

- Summary card: duration, volume, PR count
- Score earned this session
- "Done" → back to tabs

### create-routine (`app/(modals)/create-routine.tsx`)

- Name input
- Exercise list from `routineStore`
- Add Exercise → opens `exercise-picker` modal
- Default sets/reps per exercise
- Save → inserts to `user_routines` + `user_routine_exercises`

### exercise-picker (`app/(modals)/exercise-picker.tsx`)

- Search input (client-side filter on cached exercises)
- Category chips for filtering
- Tap exercise → adds to `routineStore`, dismisses modal

---

## 7. State Management

### authStore (`stores/authStore.ts`)

```typescript
interface AuthState {
  session: Session | null;
  user: User | null;
  onboardingComplete: boolean;
  authError: string | null;
  init(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  setOnboardingComplete(): void;
}
```

- `init()` is called once in `app/_layout.tsx` on mount
- Subscribes to `supabase.auth.onAuthStateChange` to keep `session`/`user` in sync
- On sign out: clears MMKV `daily_score_cache` key

### workoutStore (`stores/workoutStore.ts`)

```typescript
interface WorkoutState {
  workoutType: 'freestyle' | 'routine' | null;
  startedAt: string | null;                // ISO timestamp
  exercises: WorkoutExercise[];
  setWorkoutType(t): void;
  setStartedAt(t): void;
  upsertExercise(ex): void;               // add or update by exerciseId
  reset(): void;
}
```

Transient — reset after each workout. Not persisted.

### routineStore (`stores/routineStore.ts`)

```typescript
interface RoutineState {
  name: string;
  exercises: RoutineExercise[];           // { exerciseId, order, defaultSets, defaultReps }
  setName(n): void;
  addExercise(ex): void;                  // deduplicates by exerciseId
  removeExercise(exerciseId): void;
  reset(): void;
}
```

Cleared when the create-routine modal closes.

### exerciseStore (`stores/exerciseStore.ts`)

```typescript
interface ExerciseState {
  items: Exercise[];
  lastFetched: number | null;             // Unix ms
  setItems(items, ts): void;
}
```

Cached to MMKV key `exercise_cache_v1`. TTL = 7 days. On load, `useExercises` checks `lastFetched` before fetching.

---

## 8. Hooks

All hooks read from `authStore.user` for the current user's `id`.

### useDailyScore

Fetches today's row from `daily_scores`. Caches result in MMKV `daily_score_cache`. Returns `{ score: DailyScore | null, loading, refresh }`.

### useBodyPartScores

Derives per-muscle-group scores from `daily_scores.body_part_scores` JSONB column. Returns `{ scores: BodyPartScore[] }` where each has `{ label, value, color }`.

### useWorkoutHistory

Paginated fetch from `workouts` joined with `workout_exercises` → `exercises`. Page size 20. Returns `{ workouts, loading, hasMore, loadMore, refresh }`.

### useDietLogs(date: string)

Fetches `diet_logs` for the given ISO date and the current user. Returns `{ logs, loading, refresh }`.

### useSleepLogs

Fetches last 14 days from `sleep_logs` ordered by date descending. Returns `{ logs, loading, refresh }`.

### useRoutines

Fetches `user_routines` joined with `user_routine_exercises` → `exercises`. Returns `{ routines, loading, refresh }`.

### useExercises(category?: string)

Returns cached exercises (MMKV, 7-day TTL) filtered by category if provided. Fetches from `exercises` table on cache miss.

### useAutoFill(exerciseId, userId)

Fetches the last N sets for an exercise from `workout_sets` ordered by created_at descending. Used to pre-populate weight/reps fields in active-workout.

### usePRDetection(exerciseId, userId)

Queries `personal_records` for the current exercise. Returns `{ isPR(weight, reps): boolean }`.

### useScoreHistory(range: ScoreRange)

```typescript
type ScoreRange = 'Week' | 'Month' | '3 Months' | 'Year';
type ScorePoint = { date: string; total_score: number; workout_score: number; diet_score: number; sleep_score: number; };

// Exported helper:
export function sinceForRange(range: ScoreRange): string
// Returns ISO date N days ago (e.g. "2025-04-01")
```

Queries `daily_scores` filtered by `date >= sinceForRange(range)`. Computes `trend` (null if < 4 points, otherwise `Math.round(secondHalfAvg - firstHalfAvg)`). Returns `{ points, trend, loading, error }`.

### useProgressStats(since: string)

Two parallel queries:
1. `workouts` with nested `workout_exercises(workout_sets(is_pr))` — for sessions, volume, PR count
2. `sleep_logs` — for avg sleep hours

**Type casting pattern** (Supabase nested relation TypeScript workaround):
```typescript
const workouts = ((workoutsRes.data ?? []) as unknown) as {
  id: string;
  total_volume_kg: number;
  workout_exercises: { workout_sets: { is_pr: boolean }[] }[];
}[];
```

Returns `{ stats: ProgressStats, loading }`.

---

## 9. Primitives

### Sheet (`src/components/primitives/Sheet.tsx`)

Wraps `@gorhom/bottom-sheet` v5 `BottomSheetModal`.

```typescript
interface SheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];  // omit for dynamic sizing
  children: React.ReactNode;
}
```

- If `snapPoints` is omitted: `enableDynamicSizing: true` (sheet sizes to content)
- If `snapPoints` is provided: `enableDynamicSizing: false`
- Always: `enablePanDownToClose`, `keyboardBehavior="interactive"`, `keyboardBlurBehavior="restore"`, `animateOnMount`
- Backdrop: `BottomSheetBackdrop` with `pressBehavior="close"`, `disappearsOnIndex={-1}`, `appearsOnIndex={0}`
- Imperative control: `ref.current?.present()` when `visible` becomes true, `ref.current?.dismiss()` when false

### Button (`src/components/primitives/Button.tsx`)

```typescript
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';  // default: primary
  size?: 'default' | 'compact';                  // default: default (56px height)
  icon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
}
```

### Card (`src/components/primitives/Card.tsx`)

```typescript
interface CardProps {
  padding?: 'none' | 'compact' | 'default' | 'comfortable';
  children: React.ReactNode;
  style?: ViewStyle;
}
```

### Input (`src/components/primitives/Input.tsx`)

Floating animated label. Error state shows `colors.alert` border.

```typescript
interface InputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
}
```

### SegmentedControl

```typescript
interface Props {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}
```

### RoutineCard

```typescript
interface RoutineCardProps {
  routine: Routine;
  onStart: () => void;
  onOptions: () => void;
}
```

---

## 10. Supabase Schema

All queries use Row Level Security. `user_id` is always the authenticated user's UUID.

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | matches `auth.users.id` |
| `email` | text | |
| `name` | text | |
| `height_cm` | int | |
| `weight_kg` | numeric | |
| `age` | int | |
| `gender` | text | |
| `fitness_level` | text | beginner / intermediate / advanced |
| `goal` | text | bulk / maintain / cut |
| `avg_sleep_hours` | numeric | |
| `diet_consistency` | text | |
| `onboarding_complete` | boolean | |

### `workouts`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `completed_at` | timestamptz | |
| `duration_seconds` | int | |
| `total_volume_kg` | numeric | |
| `workout_type` | text | freestyle / routine |
| `routine_id` | uuid FK → user_routines nullable | |

### `workout_exercises`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workout_id` | uuid FK → workouts | |
| `exercise_id` | uuid FK → exercises | |
| `order` | int | display order |

### `workout_sets`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `workout_exercise_id` | uuid FK → workout_exercises | |
| `set_number` | int | |
| `weight_kg` | numeric | |
| `reps` | int | |
| `is_pr` | boolean | |

### `exercises`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `category` | text | |
| `primary_muscles` | text[] | **array**, not text |
| `secondary_muscles` | text[] | |
| `equipment` | text | |
| `instructions` | text | |

**Important:** `primary_muscles` is `text[]`. Always handle both array and string:
```typescript
const raw = exercise.primary_muscles;
const display = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
```

### `user_routines`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `name` | text | |
| `created_at` | timestamptz | |

### `user_routine_exercises`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `routine_id` | uuid FK → user_routines | |
| `exercise_id` | uuid FK → exercises | |
| `order` | int | |
| `default_sets` | int | |
| `default_reps` | int | |

### `daily_scores`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `date` | date | ISO string e.g. "2025-05-01" |
| `total_score` | int | 0–100 |
| `workout_score` | int | 0–100 |
| `diet_score` | int | 0–100 |
| `sleep_score` | int | 0–100 |
| `body_part_scores` | jsonb | `{ CHEST: 72, BACK: 55, ... }` |
| `insights` | text[] | array of insight strings |

### `diet_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `date` | date | |
| `meal_type` | text | breakfast / lunch / dinner / snack |
| `food_name` | text | |
| `calories` | numeric | |
| `protein_g` | numeric | |
| `carbs_g` | numeric | |
| `fat_g` | numeric | |
| `weight_g` | numeric | serving weight |

### `sleep_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `date` | date | night of sleep |
| `hours` | numeric | |
| `quality` | text | poor / fair / good / excellent |

### `personal_records`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | |
| `exercise_id` | uuid FK → exercises | |
| `weight_kg` | numeric | best weight |
| `reps` | int | reps at that weight |
| `achieved_at` | timestamptz | |

---

## 11. Key Workflows

### Workout flow

1. User taps "Start Routine" on a routine card
2. `workoutStore.reset()` called
3. Routine exercises loaded into `workoutStore` via `workoutStore.upsertExercise()`
4. Navigate to `/(modals)/active-workout?mode=routine&routineId=...`
5. `active-workout` screen reads exercises from `workoutStore`
6. User logs sets — `usePRDetection` flags PRs in real time
7. `useAutoFill` pre-fills weight/reps from last session
8. Finish → insert `workouts` row → insert `workout_exercises` rows → insert `workout_sets` rows
9. Server-side trigger (Supabase function) recomputes `daily_scores`
10. Navigate to `/(modals)/finish-workout?workoutId=...&duration=...&totalVolumeKg=...`

Freestyle flow is identical except no `routineId`.

### Diet logging flow

1. User taps "+" on a meal section in Logs > Diet
2. `addFoodMealType` state set → `AddFoodSheet` `visible` prop becomes `true`
3. Sheet animates in via `BottomSheetModal.present()`
4. User searches (300ms debounce) → FatSecret API returns results
5. Tap result → detail view with weight slider (adjusts macros proportionally)
6. "Log Food" → inserts to `diet_logs`, closes sheet
7. `useDietLogs` refreshed

### Sleep logging flow

1. "Log Sleep" button → `showSleepSheet` state → `LogSleepSheet visible`
2. Hours slider (0–12h, 0.5h steps) + quality chip
3. "Save" → upserts `sleep_logs` (by user_id + date)
4. Sheet dismissed, `useSleepLogs` refreshed

### Routine creation flow

1. Navigate to `/(modals)/create-routine`
2. `routineStore.reset()` on mount
3. Name input → `routineStore.setName()`
4. "Add Exercise" → navigate to `/(modals)/exercise-picker?routineId=...`
5. Exercise picker: search/filter, tap → `routineStore.addExercise()`, dismiss
6. "Save Routine" → insert `user_routines` row, insert `user_routine_exercises` rows
7. `useRoutines` refreshed

### Auth & onboarding flow

1. App cold start → `authStore.init()` → checks `supabase.auth.getSession()`
2. No session → `/auth/login` or `/auth/signup`
3. Sign up creates `auth.users` entry; Supabase trigger creates `users` row
4. `onboardingComplete` is `false` → redirect to `/onboarding/basic-info`
5. Each onboarding screen updates `users` table, navigates to next
6. `character-reveal` → calls `authStore.setOnboardingComplete()` → updates `users.onboarding_complete = true`
7. Root layout sees `onboardingComplete = true` → redirects to `/(tabs)/home`

---

## 12. Local Storage (MMKV)

`lib/storage.ts` exports a single MMKV instance.

Keys used:
| Key | Value | TTL |
|---|---|---|
| `daily_score_cache` | JSON stringified `DailyScore` | Today only (checked by date) |
| `exercise_cache_v1` | JSON `{ items: Exercise[], lastFetched: number }` | 7 days |

Cache cleared on `authStore.signOut()`.

---

## 13. Environment Variables

File: `.env` in project root (never commit).

```
EXPO_PUBLIC_SUPABASE_URL=https://expyhcszamtmkxcpfuzt.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<jwt>
FATSECRET_CLIENT_ID=<id>
FATSECRET_CLIENT_SECRET=<secret>
```

`EXPO_PUBLIC_` prefix makes variables available client-side via `process.env`. FatSecret keys are server-only (used in `lib/fatsecret/client.ts` with no `EXPO_PUBLIC_` prefix — keep them that way if you move to an Edge Function).

---

## 14. Coding Conventions

### Imports & aliases

Path alias `@` resolves to `./src`. Use it for primitives:
```typescript
import { Button, Card, Sheet } from '@/components/primitives';
```

Use relative paths for everything else (`../hooks/useDailyScore`, `../../lib/supabase`).

### No raw values

```typescript
// ✗ Wrong
style={{ backgroundColor: '#F4F1EC', borderRadius: 20, padding: 16 }}

// ✓ Correct
style={{ backgroundColor: colors.bg, borderRadius: radius.card, padding: spacing.lg }}
```

### Supabase nested type casting

When querying nested relations and TypeScript complains about `SelectQueryError`:
```typescript
const data = ((res.data ?? []) as unknown) as YourExpectedType[];
```

### Cancelled flag pattern for async effects

```typescript
useEffect(() => {
  let cancelled = false;
  const run = async () => {
    const data = await fetchSomething();
    if (cancelled) return;
    setState(data);
  };
  run();
  return () => { cancelled = true; };
}, [deps]);
```

### Always-mounted sheets

Never conditionally render a `Sheet` component. Mount it always, control visibility via `visible` prop:
```tsx
// ✗ Wrong — breaks animation lifecycle
{condition && <MySheet onClose={...} />}

// ✓ Correct
<MySheet visible={condition} onClose={() => setCondition(false)} />
```

### SVG animation

Use `Animated.createAnimatedComponent` to animate SVG elements. Always `useNativeDriver: false` for SVG properties:
```typescript
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
// useNativeDriver: false — SVG props can't use native thread
```

### primary_muscles is an array

The `exercises.primary_muscles` column is `text[]` in Postgres. Always guard:
```typescript
const muscles = Array.isArray(raw) ? raw.join(', ') : (raw ?? '');
```

---

## 15. Adding New Features

### New screen (tab)

1. Create `app/(tabs)/yourscreen.tsx`
2. Add `<Tabs.Screen name="yourscreen" />` in `app/(tabs)/_layout.tsx`
3. Add tab icon to `FloatingTabBar`

### New modal

1. Create `app/(modals)/your-modal.tsx`
2. Add `<Stack.Screen name="(modals)/your-modal" options={{ presentation: 'modal' }} />` in `app/_layout.tsx`
3. Navigate: `router.push('/(modals)/your-modal')`; pass params: `router.push({ pathname: '/(modals)/your-modal', params: { id: '...' } })`

### New bottom sheet

1. Create a component that accepts `visible: boolean` and `onClose: () => void`
2. Use `<Sheet visible={visible} onClose={onClose}>` inside (no snapPoints for dynamic sizing)
3. Always mount it in parent with `visible` prop — never conditional render

### New hook

1. Create `hooks/useYourHook.ts`
2. Read `user` from `useAuthStore()`
3. Use the cancelled-flag pattern for async effects
4. Return `{ data, loading, error }`

### New Supabase query

- Always filter by `user_id` (RLS enforces this, but be explicit)
- Prefer `.select('col1, col2')` over `.select('*')` for performance
- Cast nested query results with `as unknown` pattern if TypeScript complains
