// Pre-defined workout templates from popular fitness influencers and bodybuilders.
// searchName is a simplified name used for case-insensitive DB matching.
// Sets/reps are from each athlete's publicly shared program; defaults used where unspecified.

export interface TemplateExercise {
  displayName: string;
  searchName: string;
  sets: number;
  reps: number;
}

export interface TemplateDay {
  label: string;
  exercises: TemplateExercise[];
}

export interface InfluencerTemplate {
  id: string;
  name: string;
  alias: string;
  badge: string;
  splitType: string;
  philosophy: string;
  // 'accent' | 'success' — maps to theme color tokens
  accentKey: 'accent' | 'success';
  days: TemplateDay[];
}

export const INFLUENCER_TEMPLATES: InfluencerTemplate[] = [
  // ─────────────────────────────────────────────────────────────────
  // Chris Bumstead — 9-Day Bro Split (3 on / 1 off)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'cbum',
    name: 'Chris Bumstead',
    alias: 'CBum',
    badge: '6× Classic Physique Mr. Olympia',
    splitType: '9-Day Split · 6 Workouts',
    philosophy:
      'Quality over quantity. Symmetry, proportion, and stage-ready conditioning. Controlled eccentrics, full stretch, deliberate contractions on every rep.',
    accentKey: 'accent',
    days: [
      {
        label: 'Legs – Quad Focus',
        exercises: [
          { displayName: 'Leg Extension (pre-exhaust)', searchName: 'Leg Extension', sets: 4, reps: 12 },
          { displayName: 'Smith Machine Squat',         searchName: 'Smith Machine Squat', sets: 4, reps: 8 },
          { displayName: 'Leg Press',                   searchName: 'Leg Press', sets: 4, reps: 10 },
          { displayName: 'Hack Squat',                  searchName: 'Hack Squat', sets: 3, reps: 10 },
          { displayName: 'Seated Leg Curl',             searchName: 'Seated Leg Curl', sets: 3, reps: 12 },
          { displayName: 'Standing Calf Raise',         searchName: 'Standing Calf Raise', sets: 4, reps: 15 },
        ],
      },
      {
        label: 'Chest & Triceps',
        exercises: [
          { displayName: 'Incline Dumbbell Press',  searchName: 'Incline Dumbbell Press', sets: 4, reps: 10 },
          { displayName: 'Barbell Bench Press',     searchName: 'Barbell Bench Press', sets: 4, reps: 10 },
          { displayName: 'Cable Fly',               searchName: 'Cable Fly', sets: 3, reps: 15 },
          { displayName: 'Dumbbell Fly',            searchName: 'Dumbbell Fly', sets: 3, reps: 12 },
          { displayName: 'Skull Crusher',           searchName: 'Skull Crusher', sets: 3, reps: 12 },
          { displayName: 'Triceps Pushdown',        searchName: 'Triceps Pushdown', sets: 3, reps: 15 },
          { displayName: 'Push Up (to failure)',    searchName: 'Push Up', sets: 1, reps: 15 },
        ],
      },
      {
        label: 'Back – Thickness',
        exercises: [
          { displayName: 'Lat Pulldown (close underhand)', searchName: 'Lat Pulldown', sets: 4, reps: 12 },
          { displayName: 'Chest Supported DB Row',         searchName: 'Chest Supported Dumbbell Row', sets: 4, reps: 10 },
          { displayName: 'T-Bar Row',                      searchName: 'T Bar Row', sets: 4, reps: 10 },
          { displayName: 'Seated Cable Row',               searchName: 'Seated Cable Row', sets: 4, reps: 10 },
          { displayName: 'Straight-Arm Pulldown',          searchName: 'Straight Arm Pulldown', sets: 3, reps: 12 },
          { displayName: 'Barbell Curl',                   searchName: 'Barbell Curl', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Shoulders',
        exercises: [
          { displayName: 'Seated Dumbbell Press', searchName: 'Seated Dumbbell Shoulder Press', sets: 4, reps: 10 },
          { displayName: 'Cable Lateral Raise',   searchName: 'Cable Lateral Raise', sets: 4, reps: 15 },
          { displayName: 'Front Raise',           searchName: 'Front Raise', sets: 3, reps: 12 },
          { displayName: 'Rear Delt Fly',         searchName: 'Rear Delt Fly', sets: 3, reps: 15 },
          { displayName: 'Face Pull',             searchName: 'Face Pull', sets: 3, reps: 15 },
          { displayName: 'Upright Row',           searchName: 'Upright Row', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Legs – Hamstring Focus',
        exercises: [
          { displayName: 'Lying Leg Curl (pre-exhaust)', searchName: 'Lying Leg Curl', sets: 4, reps: 12 },
          { displayName: 'Romanian Deadlift',            searchName: 'Romanian Deadlift', sets: 4, reps: 8 },
          { displayName: 'Seated Leg Curl',              searchName: 'Seated Leg Curl', sets: 3, reps: 12 },
          { displayName: 'Standing Leg Curl',            searchName: 'Standing Leg Curl', sets: 3, reps: 12 },
          { displayName: 'Lat Pulldown (wide grip)',     searchName: 'Lat Pulldown', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Back – Width & Biceps',
        exercises: [
          { displayName: 'Wide Grip Pull Up',   searchName: 'Pull Up', sets: 4, reps: 8 },
          { displayName: 'Wide Lat Pulldown',   searchName: 'Lat Pulldown', sets: 4, reps: 12 },
          { displayName: 'Single-Arm DB Row',   searchName: 'Dumbbell Row', sets: 4, reps: 10 },
          { displayName: 'Barbell Curl',        searchName: 'Barbell Curl', sets: 3, reps: 12 },
          { displayName: 'Hammer Curl',         searchName: 'Hammer Curl', sets: 3, reps: 12 },
          { displayName: 'Low Cable Curl',      searchName: 'Cable Curl', sets: 3, reps: 12 },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Jeff Nippard — Upper/Lower + PPL Hybrid (5-6 days)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'nippard',
    name: 'Jeff Nippard',
    alias: 'The Science Guy',
    badge: 'BSc Biochemistry · IFBB Natural Pro',
    splitType: 'Upper/Lower Hybrid · 5 Workouts',
    philosophy:
      'Evidence-based training optimized for hypertrophy. Progressive overload tracked weekly. Reps In Reserve 0–3. Periodize: accumulation → intensification.',
    accentKey: 'success',
    days: [
      {
        label: 'Upper A – Chest & Shoulders',
        exercises: [
          { displayName: 'Barbell Bench Press',       searchName: 'Barbell Bench Press', sets: 4, reps: 5 },
          { displayName: 'Incline Dumbbell Press',    searchName: 'Incline Dumbbell Press', sets: 3, reps: 10 },
          { displayName: 'Cable Fly',                 searchName: 'Cable Fly', sets: 3, reps: 13 },
          { displayName: 'Overhead Press',            searchName: 'Overhead Press', sets: 3, reps: 10 },
          { displayName: 'Lateral Raise',             searchName: 'Lateral Raise', sets: 4, reps: 17 },
          { displayName: 'Triceps Pushdown',          searchName: 'Triceps Pushdown', sets: 3, reps: 13 },
          { displayName: 'Overhead Triceps Extension',searchName: 'Overhead Triceps Extension', sets: 3, reps: 11 },
        ],
      },
      {
        label: 'Lower A – Quad Dominant',
        exercises: [
          { displayName: 'Barbell Squat',        searchName: 'Barbell Squat', sets: 4, reps: 5 },
          { displayName: 'Bulgarian Split Squat', searchName: 'Bulgarian Split Squat', sets: 3, reps: 9 },
          { displayName: 'Leg Extension',         searchName: 'Leg Extension', sets: 3, reps: 13 },
          { displayName: 'Leg Press',             searchName: 'Leg Press', sets: 3, reps: 11 },
          { displayName: 'Standing Calf Raise',   searchName: 'Standing Calf Raise', sets: 4, reps: 12 },
          { displayName: 'Seated Calf Raise',     searchName: 'Seated Calf Raise', sets: 3, reps: 13 },
        ],
      },
      {
        label: 'Upper B – Back & Biceps',
        exercises: [
          { displayName: 'Weighted Pull Up',   searchName: 'Pull Up', sets: 4, reps: 5 },
          { displayName: 'Barbell Row',        searchName: 'Barbell Row', sets: 3, reps: 7 },
          { displayName: 'Seated Cable Row',   searchName: 'Seated Cable Row', sets: 3, reps: 11 },
          { displayName: 'Lat Pulldown',       searchName: 'Lat Pulldown', sets: 3, reps: 11 },
          { displayName: 'Rear Delt Fly',      searchName: 'Rear Delt Fly', sets: 3, reps: 17 },
          { displayName: 'Barbell Curl',       searchName: 'Barbell Curl', sets: 3, reps: 10 },
          { displayName: 'Hammer Curl',        searchName: 'Hammer Curl', sets: 3, reps: 11 },
        ],
      },
      {
        label: 'Lower B – Hip Dominant',
        exercises: [
          { displayName: 'Romanian Deadlift', searchName: 'Romanian Deadlift', sets: 4, reps: 7 },
          { displayName: 'Leg Curl',          searchName: 'Lying Leg Curl', sets: 4, reps: 11 },
          { displayName: 'Hip Thrust',        searchName: 'Hip Thrust', sets: 3, reps: 11 },
          { displayName: 'Walking Lunge',     searchName: 'Walking Lunge', sets: 3, reps: 12 },
          { displayName: 'Seated Leg Curl',   searchName: 'Seated Leg Curl', sets: 3, reps: 13 },
          { displayName: 'Calf Raise',        searchName: 'Calf Raise', sets: 3, reps: 15 },
        ],
      },
      {
        label: 'Full Upper',
        exercises: [
          { displayName: 'Barbell Bench Press', searchName: 'Barbell Bench Press', sets: 4, reps: 6 },
          { displayName: 'Pull Up',             searchName: 'Pull Up', sets: 4, reps: 8 },
          { displayName: 'Lateral Raise',       searchName: 'Lateral Raise', sets: 3, reps: 15 },
          { displayName: 'Barbell Curl',        searchName: 'Barbell Curl', sets: 3, reps: 10 },
          { displayName: 'Triceps Pushdown',    searchName: 'Triceps Pushdown', sets: 3, reps: 13 },
          { displayName: 'Face Pull',           searchName: 'Face Pull', sets: 3, reps: 15 },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Arnold Schwarzenegger — Arnold Split (6 days, 3 workouts × 2)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'arnold',
    name: 'Arnold Schwarzenegger',
    alias: 'The Austrian Oak',
    badge: '7× Mr. Olympia Champion',
    splitType: 'Arnold Split · 6 Days · Each Muscle 2×',
    philosophy:
      'High volume, twice-a-day training. Shock the muscles constantly. Supersets of opposing muscles. Train until failure — the pump is everything. Volume is king.',
    accentKey: 'accent',
    days: [
      {
        label: 'Chest & Back (Days 1 & 4)',
        exercises: [
          { displayName: 'Barbell Bench Press',  searchName: 'Barbell Bench Press', sets: 4, reps: 10 },
          { displayName: 'Pull Up',              searchName: 'Pull Up', sets: 4, reps: 10 },
          { displayName: 'Incline Dumbbell Press', searchName: 'Incline Dumbbell Press', sets: 4, reps: 10 },
          { displayName: 'T-Bar Row',            searchName: 'T Bar Row', sets: 4, reps: 10 },
          { displayName: 'Dumbbell Pullover',    searchName: 'Dumbbell Pullover', sets: 4, reps: 10 },
          { displayName: 'Seated Cable Row',     searchName: 'Seated Cable Row', sets: 4, reps: 10 },
          { displayName: 'Dumbbell Fly',         searchName: 'Dumbbell Fly', sets: 4, reps: 10 },
          { displayName: 'Lat Pulldown',         searchName: 'Lat Pulldown', sets: 4, reps: 10 },
          { displayName: 'Decline Bench Press',  searchName: 'Decline Barbell Bench Press', sets: 3, reps: 10 },
        ],
      },
      {
        label: 'Shoulders & Arms (Days 2 & 5)',
        exercises: [
          { displayName: 'Arnold Press',              searchName: 'Arnold Press', sets: 4, reps: 10 },
          { displayName: 'Lateral Raise',             searchName: 'Lateral Raise', sets: 4, reps: 12 },
          { displayName: 'Barbell Curl',              searchName: 'Barbell Curl', sets: 4, reps: 10 },
          { displayName: 'Behind-the-Neck Press',     searchName: 'Behind The Neck Press', sets: 4, reps: 10 },
          { displayName: 'Incline Dumbbell Curl',     searchName: 'Incline Dumbbell Curl', sets: 3, reps: 10 },
          { displayName: 'Concentration Curl',        searchName: 'Concentration Curl', sets: 3, reps: 12 },
          { displayName: 'Close Grip Bench Press',    searchName: 'Close Grip Bench Press', sets: 4, reps: 10 },
          { displayName: 'Skull Crusher',             searchName: 'Skull Crusher', sets: 3, reps: 10 },
          { displayName: 'Triceps Pushdown',          searchName: 'Triceps Pushdown', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Legs & Lower Back (Days 3 & 6)',
        exercises: [
          { displayName: 'Barbell Squat',       searchName: 'Barbell Squat', sets: 6, reps: 10 },
          { displayName: 'Leg Press',           searchName: 'Leg Press', sets: 6, reps: 10 },
          { displayName: 'Lying Leg Curl',      searchName: 'Lying Leg Curl', sets: 6, reps: 10 },
          { displayName: 'Stiff Leg Deadlift',  searchName: 'Stiff Leg Deadlift', sets: 3, reps: 10 },
          { displayName: 'Standing Calf Raise', searchName: 'Standing Calf Raise', sets: 5, reps: 15 },
          { displayName: 'Seated Calf Raise',   searchName: 'Seated Calf Raise', sets: 4, reps: 15 },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Ronnie Coleman — Powerbuilder Split (6 days, 3 workouts × 2)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'ronnie',
    name: 'Ronnie Coleman',
    alias: 'The King',
    badge: '8× Consecutive Mr. Olympia',
    splitType: 'Powerbuilder Split · 6 Days · Each Muscle 2×',
    philosophy:
      'Maximum weight, maximum form. Powerbuilder mindset: 500 lb bench + 800 lb squat for reps. High volume per session. Nobody wants to lift heavy-ass weights.',
    accentKey: 'accent',
    days: [
      {
        label: 'Back & Biceps (Days 1 & 4)',
        exercises: [
          { displayName: 'Barbell Deadlift',   searchName: 'Deadlift', sets: 4, reps: 8 },
          { displayName: 'Barbell Row',         searchName: 'Barbell Row', sets: 4, reps: 10 },
          { displayName: 'T-Bar Row',           searchName: 'T Bar Row', sets: 4, reps: 10 },
          { displayName: 'Single-Arm DB Row',   searchName: 'Dumbbell Row', sets: 4, reps: 10 },
          { displayName: 'Lat Pulldown',        searchName: 'Lat Pulldown', sets: 3, reps: 12 },
          { displayName: 'Seated Cable Row',    searchName: 'Seated Cable Row', sets: 3, reps: 12 },
          { displayName: 'Barbell Curl',        searchName: 'Barbell Curl', sets: 4, reps: 10 },
          { displayName: 'Alternating DB Curl', searchName: 'Dumbbell Curl', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Chest & Triceps (Days 2 & 5)',
        exercises: [
          { displayName: 'Barbell Bench Press',  searchName: 'Barbell Bench Press', sets: 4, reps: 8 },
          { displayName: 'Incline Barbell Press', searchName: 'Incline Barbell Bench Press', sets: 4, reps: 10 },
          { displayName: 'Chest Press Machine',  searchName: 'Chest Press', sets: 3, reps: 10 },
          { displayName: 'Dumbbell Fly',         searchName: 'Dumbbell Fly', sets: 3, reps: 12 },
          { displayName: 'Triceps Pushdown',     searchName: 'Triceps Pushdown', sets: 4, reps: 12 },
          { displayName: 'Skull Crusher',        searchName: 'Skull Crusher', sets: 3, reps: 10 },
          { displayName: 'Close Grip Bench Press', searchName: 'Close Grip Bench Press', sets: 3, reps: 10 },
        ],
      },
      {
        label: 'Legs & Shoulders (Days 3 & 6)',
        exercises: [
          { displayName: 'Barbell Squat',   searchName: 'Barbell Squat', sets: 4, reps: 8 },
          { displayName: 'Leg Press',       searchName: 'Leg Press', sets: 4, reps: 12 },
          { displayName: 'Leg Extension',   searchName: 'Leg Extension', sets: 3, reps: 15 },
          { displayName: 'Lying Leg Curl',  searchName: 'Lying Leg Curl', sets: 3, reps: 12 },
          { displayName: 'Seated Leg Curl', searchName: 'Seated Leg Curl', sets: 3, reps: 12 },
          { displayName: 'Military Press',  searchName: 'Overhead Press', sets: 4, reps: 10 },
          { displayName: 'Lateral Raise',   searchName: 'Lateral Raise', sets: 3, reps: 12 },
          { displayName: 'Rear Delt Raise', searchName: 'Rear Delt Fly', sets: 3, reps: 15 },
          { displayName: 'Calf Raise',      searchName: 'Standing Calf Raise', sets: 3, reps: 15 },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // David Laid — PPL DUP Hybrid (6 days, strength + hypertrophy rotation)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'laid',
    name: 'David Laid',
    alias: 'DUP King',
    badge: 'Gymshark Athlete · Creative Director',
    splitType: 'DUP PPL · 6 Days · Strength + Hypertrophy',
    philosophy:
      'Daily Undulating Periodization — rotating between strength, hypertrophy, and endurance for the same muscle each week. Same muscle group, different stimuli.',
    accentKey: 'success',
    days: [
      {
        label: 'Push – Strength',
        exercises: [
          { displayName: 'Barbell Bench Press (heavy)',  searchName: 'Barbell Bench Press', sets: 3, reps: 4 },
          { displayName: 'Overhead Press',              searchName: 'Overhead Press', sets: 4, reps: 5 },
          { displayName: 'Incline Dumbbell Press',      searchName: 'Incline Dumbbell Press', sets: 4, reps: 7 },
          { displayName: 'Close Grip Bench Press',      searchName: 'Close Grip Bench Press', sets: 3, reps: 7 },
        ],
      },
      {
        label: 'Pull – Strength',
        exercises: [
          { displayName: 'Weighted Pull Up',  searchName: 'Pull Up', sets: 3, reps: 4 },
          { displayName: 'Barbell Row',       searchName: 'Barbell Row', sets: 4, reps: 5 },
          { displayName: 'Barbell Deadlift',  searchName: 'Deadlift', sets: 4, reps: 4 },
          { displayName: 'Barbell Curl',      searchName: 'Barbell Curl', sets: 3, reps: 6 },
        ],
      },
      {
        label: 'Legs – Strength',
        exercises: [
          { displayName: 'Barbell Squat (heavy)', searchName: 'Barbell Squat', sets: 3, reps: 4 },
          { displayName: 'Romanian Deadlift',     searchName: 'Romanian Deadlift', sets: 4, reps: 5 },
          { displayName: 'Leg Press',             searchName: 'Leg Press', sets: 4, reps: 6 },
        ],
      },
      {
        label: 'Push – Hypertrophy',
        exercises: [
          { displayName: 'Incline Barbell Press', searchName: 'Incline Barbell Bench Press', sets: 4, reps: 10 },
          { displayName: 'Cable Crossover',       searchName: 'Cable Crossover', sets: 4, reps: 15 },
          { displayName: 'Lateral Raise',         searchName: 'Lateral Raise', sets: 4, reps: 15 },
          { displayName: 'Triceps Pushdown',      searchName: 'Triceps Pushdown', sets: 4, reps: 13 },
        ],
      },
      {
        label: 'Pull – Hypertrophy',
        exercises: [
          { displayName: 'Lat Pulldown',    searchName: 'Lat Pulldown', sets: 4, reps: 11 },
          { displayName: 'Seated Cable Row', searchName: 'Seated Cable Row', sets: 4, reps: 11 },
          { displayName: 'Face Pull',       searchName: 'Face Pull', sets: 3, reps: 15 },
          { displayName: 'Dumbbell Curl',   searchName: 'Dumbbell Curl', sets: 3, reps: 12 },
          { displayName: 'Hammer Curl',     searchName: 'Hammer Curl', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Legs – Hypertrophy',
        exercises: [
          { displayName: 'Leg Press',       searchName: 'Leg Press', sets: 4, reps: 12 },
          { displayName: 'Hack Squat',      searchName: 'Hack Squat', sets: 3, reps: 12 },
          { displayName: 'Leg Extension',   searchName: 'Leg Extension', sets: 3, reps: 15 },
          { displayName: 'Lying Leg Curl',  searchName: 'Lying Leg Curl', sets: 3, reps: 13 },
          { displayName: 'Calf Raise',      searchName: 'Calf Raise', sets: 4, reps: 15 },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Bradley Martyn — 5-Day Bro Split (instinctive bodybuilding)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'martyn',
    name: 'Bradley Martyn',
    alias: 'Zoo Culture',
    badge: 'Zoo Culture Gym Owner · BMFit',
    splitType: '5-Day Bro Split · Bodybuilding',
    philosophy:
      'Moderate weights, full range of motion, intense mind-muscle connection. Train instinctively — switch exercises based on how the body responds. Never ego lift.',
    accentKey: 'accent',
    days: [
      {
        label: 'Chest & Shoulders',
        exercises: [
          { displayName: 'Barbell Bench Press',   searchName: 'Barbell Bench Press', sets: 4, reps: 12 },
          { displayName: 'Incline Dumbbell Press', searchName: 'Incline Dumbbell Press', sets: 4, reps: 12 },
          { displayName: 'Cable Fly',             searchName: 'Cable Fly', sets: 3, reps: 12 },
          { displayName: 'Dumbbell Shoulder Press', searchName: 'Dumbbell Shoulder Press', sets: 5, reps: 10 },
          { displayName: 'Lateral Raise',         searchName: 'Lateral Raise', sets: 4, reps: 12 },
          { displayName: 'Front Raise',           searchName: 'Front Raise', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Back',
        exercises: [
          { displayName: 'Pull Up',     searchName: 'Pull Up', sets: 4, reps: 10 },
          { displayName: 'Barbell Row', searchName: 'Barbell Row', sets: 4, reps: 10 },
          { displayName: 'T-Bar Row',   searchName: 'T Bar Row', sets: 4, reps: 10 },
          { displayName: 'Dumbbell Row', searchName: 'Dumbbell Row', sets: 4, reps: 10 },
        ],
      },
      {
        label: 'Legs',
        exercises: [
          { displayName: 'Barbell Squat', searchName: 'Barbell Squat', sets: 4, reps: 10 },
          { displayName: 'Leg Press',     searchName: 'Leg Press', sets: 4, reps: 12 },
          { displayName: 'Leg Extension', searchName: 'Leg Extension', sets: 4, reps: 12 },
          { displayName: 'Lying Leg Curl', searchName: 'Lying Leg Curl', sets: 4, reps: 10 },
        ],
      },
      {
        label: 'Arms',
        exercises: [
          { displayName: 'Barbell Curl',        searchName: 'Barbell Curl', sets: 4, reps: 8 },
          { displayName: 'Incline Dumbbell Curl', searchName: 'Incline Dumbbell Curl', sets: 4, reps: 10 },
          { displayName: 'Hammer Curl',         searchName: 'Hammer Curl', sets: 4, reps: 10 },
          { displayName: 'Close Grip Bench Press', searchName: 'Close Grip Bench Press', sets: 4, reps: 10 },
          { displayName: 'Triceps Pushdown',    searchName: 'Triceps Pushdown', sets: 4, reps: 12 },
          { displayName: 'Skull Crusher',       searchName: 'Skull Crusher', sets: 3, reps: 10 },
        ],
      },
      {
        label: 'Shoulders (Dedicated)',
        exercises: [
          { displayName: 'Seated Dumbbell Press', searchName: 'Seated Dumbbell Shoulder Press', sets: 5, reps: 10 },
          { displayName: 'Arnold Press',           searchName: 'Arnold Press', sets: 4, reps: 10 },
          { displayName: 'Lateral Raise',          searchName: 'Lateral Raise', sets: 4, reps: 12 },
          { displayName: 'Rear Delt Fly',          searchName: 'Rear Delt Fly', sets: 3, reps: 15 },
          { displayName: 'Barbell Shrug',          searchName: 'Barbell Shrug', sets: 3, reps: 15 },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Simeon Panda — 5-Day Aesthetic Bro Split (natural)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'panda',
    name: 'Simeon Panda',
    alias: 'Natural Giant',
    badge: 'INBA Natural Pro · SP Aesthetics',
    splitType: '5-Day Body Part Split · Natural',
    philosophy:
      'Natural bodybuilding with aesthetic focus — V-taper, proportion, year-round conditioning. Consistency over intensity spikes. Build a physique that endures.',
    accentKey: 'success',
    days: [
      {
        label: 'Chest',
        exercises: [
          { displayName: 'Barbell Bench Press',   searchName: 'Barbell Bench Press', sets: 4, reps: 10 },
          { displayName: 'Incline Dumbbell Press', searchName: 'Incline Dumbbell Press', sets: 3, reps: 12 },
          { displayName: 'Decline Bench Press',   searchName: 'Decline Barbell Bench Press', sets: 3, reps: 10 },
          { displayName: 'Cable Crossover',       searchName: 'Cable Crossover', sets: 3, reps: 15 },
          { displayName: 'Push Up',               searchName: 'Push Up', sets: 1, reps: 15 },
        ],
      },
      {
        label: 'Back & Biceps',
        exercises: [
          { displayName: 'Barbell Deadlift',  searchName: 'Deadlift', sets: 4, reps: 7 },
          { displayName: 'Barbell Row',       searchName: 'Barbell Row', sets: 4, reps: 10 },
          { displayName: 'T-Bar Row',         searchName: 'T Bar Row', sets: 3, reps: 10 },
          { displayName: 'Lat Pulldown',      searchName: 'Lat Pulldown', sets: 3, reps: 12 },
          { displayName: 'Barbell Curl',      searchName: 'Barbell Curl', sets: 4, reps: 10 },
          { displayName: 'Concentration Curl', searchName: 'Concentration Curl', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Shoulders',
        exercises: [
          { displayName: 'Overhead Press',  searchName: 'Overhead Press', sets: 4, reps: 8 },
          { displayName: 'Lateral Raise',   searchName: 'Lateral Raise', sets: 4, reps: 12 },
          { displayName: 'Front Raise',     searchName: 'Front Raise', sets: 3, reps: 12 },
          { displayName: 'Rear Delt Fly',   searchName: 'Rear Delt Fly', sets: 3, reps: 15 },
          { displayName: 'Arnold Press',    searchName: 'Arnold Press', sets: 3, reps: 10 },
          { displayName: 'Barbell Shrug',   searchName: 'Barbell Shrug', sets: 3, reps: 15 },
        ],
      },
      {
        label: 'Legs',
        exercises: [
          { displayName: 'Barbell Squat',       searchName: 'Barbell Squat', sets: 5, reps: 5 },
          { displayName: 'Hack Squat',          searchName: 'Hack Squat', sets: 3, reps: 12 },
          { displayName: 'Leg Press',           searchName: 'Leg Press', sets: 4, reps: 15 },
          { displayName: 'Leg Extension',       searchName: 'Leg Extension', sets: 3, reps: 15 },
          { displayName: 'Lying Leg Curl',      searchName: 'Lying Leg Curl', sets: 3, reps: 12 },
          { displayName: 'Standing Calf Raise', searchName: 'Standing Calf Raise', sets: 5, reps: 15 },
        ],
      },
      {
        label: 'Arms',
        exercises: [
          { displayName: 'Barbell Curl',        searchName: 'Barbell Curl', sets: 4, reps: 10 },
          { displayName: 'Incline Dumbbell Curl', searchName: 'Incline Dumbbell Curl', sets: 3, reps: 12 },
          { displayName: 'Hammer Curl',         searchName: 'Hammer Curl', sets: 3, reps: 12 },
          { displayName: 'Close Grip Bench Press', searchName: 'Close Grip Bench Press', sets: 4, reps: 10 },
          { displayName: 'Skull Crusher',       searchName: 'Skull Crusher', sets: 3, reps: 10 },
          { displayName: 'Weighted Dip',        searchName: 'Dip', sets: 2, reps: 12 },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // Noel Deyzel — PPL Hybrid (5-6 days, RYSE Supplements)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'deyzel',
    name: 'Noel Deyzel',
    alias: 'The Giant',
    badge: 'CEO, RYSE Supplements · 17+ yrs',
    splitType: 'PPL Hybrid · 6 Days',
    philosophy:
      'Discipline is the foundation of everything. Train hard, eat to grow, prioritize mental health alongside physique. Big physique, even bigger mindset.',
    accentKey: 'success',
    days: [
      {
        label: 'Push – Chest, Shoulders, Triceps',
        exercises: [
          { displayName: 'Barbell Bench Press',       searchName: 'Barbell Bench Press', sets: 4, reps: 9 },
          { displayName: 'Incline Dumbbell Press',    searchName: 'Incline Dumbbell Press', sets: 4, reps: 10 },
          { displayName: 'Cable Fly',                 searchName: 'Cable Fly', sets: 3, reps: 15 },
          { displayName: 'Seated Dumbbell Press',     searchName: 'Dumbbell Shoulder Press', sets: 4, reps: 10 },
          { displayName: 'Lateral Raise',             searchName: 'Lateral Raise', sets: 4, reps: 13 },
          { displayName: 'Triceps Pushdown',          searchName: 'Triceps Pushdown', sets: 3, reps: 15 },
          { displayName: 'Overhead Triceps Extension', searchName: 'Overhead Triceps Extension', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Pull – Back & Biceps',
        exercises: [
          { displayName: 'Weighted Pull Up', searchName: 'Pull Up', sets: 4, reps: 8 },
          { displayName: 'Barbell Row',      searchName: 'Barbell Row', sets: 4, reps: 10 },
          { displayName: 'Seated Cable Row', searchName: 'Seated Cable Row', sets: 3, reps: 12 },
          { displayName: 'Lat Pulldown',     searchName: 'Lat Pulldown', sets: 3, reps: 12 },
          { displayName: 'Face Pull',        searchName: 'Face Pull', sets: 3, reps: 15 },
          { displayName: 'Barbell Curl',     searchName: 'Barbell Curl', sets: 4, reps: 10 },
          { displayName: 'Hammer Curl',      searchName: 'Hammer Curl', sets: 3, reps: 12 },
        ],
      },
      {
        label: 'Legs',
        exercises: [
          { displayName: 'Barbell Squat',       searchName: 'Barbell Squat', sets: 5, reps: 6 },
          { displayName: 'Leg Press',           searchName: 'Leg Press', sets: 4, reps: 13 },
          { displayName: 'Leg Extension',       searchName: 'Leg Extension', sets: 3, reps: 15 },
          { displayName: 'Romanian Deadlift',   searchName: 'Romanian Deadlift', sets: 4, reps: 10 },
          { displayName: 'Lying Leg Curl',      searchName: 'Lying Leg Curl', sets: 3, reps: 12 },
          { displayName: 'Standing Calf Raise', searchName: 'Standing Calf Raise', sets: 5, reps: 15 },
        ],
      },
      {
        label: 'Push – Volume Day',
        exercises: [
          { displayName: 'Incline Barbell Press', searchName: 'Incline Barbell Bench Press', sets: 4, reps: 10 },
          { displayName: 'Cable Crossover',       searchName: 'Cable Crossover', sets: 4, reps: 15 },
          { displayName: 'Arnold Press',          searchName: 'Arnold Press', sets: 3, reps: 12 },
          { displayName: 'Cable Lateral Raise',   searchName: 'Cable Lateral Raise', sets: 4, reps: 15 },
          { displayName: 'Weighted Dip',          searchName: 'Dip', sets: 3, reps: 10 },
          { displayName: 'Skull Crusher',         searchName: 'Skull Crusher', sets: 3, reps: 10 },
        ],
      },
      {
        label: 'Pull – Arms Focus',
        exercises: [
          { displayName: 'T-Bar Row',          searchName: 'T Bar Row', sets: 4, reps: 10 },
          { displayName: 'Single-Arm DB Row',  searchName: 'Dumbbell Row', sets: 3, reps: 12 },
          { displayName: 'Dumbbell Pullover',  searchName: 'Dumbbell Pullover', sets: 3, reps: 12 },
          { displayName: 'Barbell Curl',       searchName: 'Barbell Curl', sets: 4, reps: 10 },
          { displayName: 'Concentration Curl', searchName: 'Concentration Curl', sets: 3, reps: 12 },
          { displayName: 'Triceps Pushdown',   searchName: 'Triceps Pushdown', sets: 3, reps: 15 },
        ],
      },
      {
        label: 'Legs – Posterior Chain',
        exercises: [
          { displayName: 'Romanian Deadlift', searchName: 'Romanian Deadlift', sets: 4, reps: 8 },
          { displayName: 'Lying Leg Curl',    searchName: 'Lying Leg Curl', sets: 4, reps: 11 },
          { displayName: 'Hip Thrust',        searchName: 'Hip Thrust', sets: 3, reps: 12 },
          { displayName: 'Hack Squat',        searchName: 'Hack Squat', sets: 3, reps: 12 },
          { displayName: 'Seated Calf Raise', searchName: 'Seated Calf Raise', sets: 4, reps: 15 },
        ],
      },
    ],
  },
];
