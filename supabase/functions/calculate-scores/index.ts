// @ts-nocheck — Deno runtime
// Edge Function: calculate-scores
// Bio-Adaptive Fitness RPG Engine v2.1
//
// Reads: workouts, workout_exercises, workout_sets, diet_logs, sleep_logs,
//        personal_records, initial_strength, users, muscle_stats
// Writes: muscle_stats, daily_scores

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Muscle group mapping ──────────────────────────────────────────────────────
const MUSCLE_TO_GROUP: Record<string, string> = {
  chest: 'chest', 'middle chest': 'chest', 'lower chest': 'chest', 'upper chest': 'chest',
  'pectorals': 'chest', 'pecs': 'chest',

  lats: 'back', 'middle back': 'back', 'lower back': 'back', traps: 'back',
  rhomboids: 'back', 'upper back': 'back', 'erector spinae': 'back',
  latissimus: 'back', trapezius: 'back',

  shoulders: 'shoulders', deltoids: 'shoulders', 'front deltoids': 'shoulders',
  'medial deltoids': 'shoulders', 'rear deltoids': 'shoulders',
  'rotator cuff': 'shoulders', 'anterior deltoid': 'shoulders',
  'posterior deltoid': 'shoulders', 'lateral deltoid': 'shoulders',
  delts: 'shoulders',

  biceps: 'arms', triceps: 'arms', forearms: 'arms', forearm: 'arms',
  brachialis: 'arms', brachioradialis: 'arms', 'biceps brachii': 'arms',

  quadriceps: 'legs', quads: 'legs', hamstrings: 'legs', hamstring: 'legs',
  glutes: 'legs', gluteal: 'legs', gluteus: 'legs', calves: 'legs',
  calf: 'legs', adductors: 'legs', adductor: 'legs', abductors: 'legs',
  'hip flexors': 'legs', 'hip flexor': 'legs',

  abdominals: 'core', abs: 'core', obliques: 'core', core: 'core',
  'transverse abdominis': 'core', 'rectus abdominis': 'core',
};

const ALL_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];

// ── Fitness level params ──────────────────────────────────────────────────────
const LEVEL_PARAMS = {
  beginner:     { mBase: 0.8, kAdapt: 2.0, decayRate: 0.005,  sleepMod56: 0.80, sleepModLt5: 0.50, expectedStim: 12 },
  intermediate: { mBase: 1.0, kAdapt: 1.0, decayRate: 0.0035, sleepMod56: 0.75, sleepModLt5: 0.35, expectedStim: 18 },
  advanced:     { mBase: 1.2, kAdapt: 0.5, decayRate: 0.002,  sleepMod56: 0.70, sleepModLt5: 0.20, expectedStim: 24 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Smoother dose-response RIR curve (SportRxiv 295: hypertrophy improves
// continuously as sets get closer to failure — not a hard cliff).
function eModFromRIR(rir: number | null, setType: string): number {
  if (setType === 'failure' || setType === 'amrap') return 1.0;
  if (rir === null) return 0.9; // untracked → assume ~RIR 2
  if (rir <= 1)  return 1.00;
  if (rir === 2) return 0.92;
  if (rir === 3) return 0.78;
  if (rir === 4) return 0.58;
  if (rir === 5) return 0.35;
  return 0.15; // RIR ≥ 6 — non-adaptive junk volume
}

// Power-law display transform (Option B) — unbounded but human-readable.
// Calibrated to real-world progression rates:
//   stat ≈  35  (onboarding baseline)     → display ≈  25
//   stat ≈ 1500 (1-year dedicated beginner) → display ≈ 120
//   stat ≈ 5000 (3-year intermediate)      → display ≈ 200
//   stat ≈ 15000 (elite advanced)          → display ≈ 320
// Advanced lifters accumulate stat much slower (lower kAdapt), so they
// feel the diminishing returns without any hard ceiling.
function statToDisplay(stat: number): number {
  if (stat <= 0) return 0;
  return Math.round(5.0 * Math.pow(stat, 0.418));
}

// Weekly volume efficiency — diminishing returns beyond 20 sets/week per muscle.
// (PubMed 35291645 + 27433992: 12-20 sets/week is the optimal hypertrophy zone;
// additional volume past 20 yields rapidly declining incremental gains.)
function weeklyVolumeEfficiency(weeklySets: number): number {
  if (weeklySets <= 20) return 1.0;
  return Math.max(0.15, 1.0 - (weeklySets - 20) * 0.05);
}

function mapMuscle(muscle: string): string | null {
  return MUSCLE_TO_GROUP[muscle.toLowerCase().trim()] ?? null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing Authorization' }, 401);
    }

    const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')               ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')          ?? '';
    const SERVICE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? '';

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Invalid session' }, 401);

    const admin  = createClient(SUPABASE_URL, SERVICE_KEY);
    const userId = user.id;

    const today        = new Date().toISOString().slice(0, 10);
    const yesterday    = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    const nowIso       = new Date().toISOString();

    // ── 1. User profile ───────────────────────────────────────────────────────
    const { data: profile } = await admin
      .from('users')
      .select('weight_kg, height_cm, age, gender, fitness_level, goal')
      .eq('id', userId)
      .single();

    const weightKg     = profile?.weight_kg   ?? 70;
    const heightCm     = profile?.height_cm   ?? 175;
    const heightM      = heightCm / 100;
    const age          = profile?.age         ?? 25;
    const gender       = profile?.gender      ?? 'male';
    const fitnessLevel = (profile?.fitness_level ?? 'intermediate') as keyof typeof LEVEL_PARAMS;
    const goal         = profile?.goal        ?? 'maintain';
    const params       = LEVEL_PARAMS[fitnessLevel] ?? LEVEL_PARAMS.intermediate;

    // ── 2. BMR / TDEE — computed early; needed for caloric growth modifier ────
    const bmr = gender === 'female'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
      : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const tdee      = bmr * 1.4;
    const calTarget = goal === 'bulk' ? tdee * 1.10 : goal === 'cut' ? tdee * 0.85 : tdee;

    // ── 3. Past 7 days of workouts (weekly volume tracking + today's stimulus) ─
    const { data: weekWorkouts } = await admin
      .from('workouts')
      .select(`
        id,
        completed_at,
        workout_exercises (
          exercise_id,
          exercise_target,
          workout_sets (
            weight_kg,
            reps,
            rir,
            set_type,
            is_completed
          )
        )
      `)
      .eq('user_id', userId)
      .gte('completed_at', `${sevenDaysAgo}T00:00:00Z`);

    const todayWorkouts    = (weekWorkouts ?? []).filter(w => w.completed_at?.slice(0, 10) === today);
    const histWeekWorkouts = (weekWorkouts ?? []).filter(w => w.completed_at?.slice(0, 10) !== today);

    // ── 4. Personal records → e1RM per exercise ───────────────────────────────
    const { data: prs } = await admin
      .from('personal_records')
      .select('exercise_id, weight_kg, reps')
      .eq('user_id', userId);

    const e1RMMap: Record<string, number> = {};
    for (const pr of prs ?? []) {
      const e1rm = pr.weight_kg * (1 + pr.reps / 30);
      if (!e1RMMap[pr.exercise_id] || e1RMMap[pr.exercise_id] < e1rm) {
        e1RMMap[pr.exercise_id] = e1rm;
      }
    }

    // ── 5. Exercise muscle mapping (covers all exercises seen this week) ───────
    const exerciseIds = [...new Set(
      (weekWorkouts ?? [])
        .flatMap(w => w.workout_exercises.map((we: any) => we.exercise_id).filter(Boolean))
    )];

    const { data: exercises } = exerciseIds.length > 0
      ? await admin.from('exercises').select('id, primary_muscles').in('id', exerciseIds)
      : { data: [] };

    const exMuscleMap: Record<string, string[]> = {};
    for (const ex of exercises ?? []) {
      exMuscleMap[ex.id] = Array.isArray(ex.primary_muscles) ? ex.primary_muscles : [];
    }

    function getMuscleGroups(exId: string, exerciseTarget: any): string[] {
      const rawMuscles = [...(exMuscleMap[exId] ?? [])];
      if (rawMuscles.length === 0 && exerciseTarget) {
        const targets = Array.isArray(exerciseTarget) ? exerciseTarget : [exerciseTarget];
        rawMuscles.push(...targets);
      }
      return [...new Set(rawMuscles.map(mapMuscle).filter((g): g is string => g !== null))];
    }

    // ── 6. Sleep (most recent within 2 days) ──────────────────────────────────
    const { data: sleepLogs } = await admin
      .from('sleep_logs')
      .select('hours, quality, date')
      .eq('user_id', userId)
      .in('date', [today, yesterday])
      .order('date', { ascending: false })
      .limit(1);

    const lastSleep    = sleepLogs?.[0] ?? null;
    const sleepHours   = lastSleep?.hours ?? 7;
    const sleepQuality = lastSleep?.quality ?? 'good';

    // ── 7. Today's diet ───────────────────────────────────────────────────────
    const { data: dietLogs } = await admin
      .from('diet_logs')
      .select('protein_g, calories, carbs_g, fats_g')
      .eq('user_id', userId)
      .eq('date', today);

    const totalProtein  = (dietLogs ?? []).reduce((s, l) => s + (l.protein_g ?? 0), 0);
    const totalCalories = (dietLogs ?? []).reduce((s, l) => s + (l.calories  ?? 0), 0);

    // ── 8. Recovery factors ───────────────────────────────────────────────────
    const sleepMod = sleepHours >= 7 ? 1.0
      : sleepHours >= 5 ? params.sleepMod56
      : params.sleepModLt5;

    const proteinGoal = weightKg * 1.6;
    const protMod     = Math.min(1.5, Math.max(0.5, totalProtein / proteinGoal));

    // Caloric surplus modifier — slight surplus (~10-15%) optimises MPS.
    // (PubMed 37914977: 15% surplus showed strongest gains vs maintenance/deficit)
    const calSurplusRatio = tdee > 0 && totalCalories > 0 ? totalCalories / tdee : 1.0;
    const calGrowthMod =
      (calSurplusRatio >= 1.0 && calSurplusRatio <= 1.20) ? 1.10 :
      calSurplusRatio >= 0.90 ? 1.00 :
      calSurplusRatio >= 0.80 ? 0.90 : 0.75;

    const rTotal = sleepMod * protMod * calGrowthMod;

    // ── 9. Weekly set count per muscle group (full 7-day window) ──────────────
    const weeklySetsByGroup: Record<string, number> = {};
    for (const workout of weekWorkouts ?? []) {
      for (const we of workout.workout_exercises) {
        const groups = getMuscleGroups(we.exercise_id, we.exercise_target);
        for (const set of we.workout_sets) {
          if (!set.is_completed || set.set_type === 'warmup') continue;
          for (const group of groups) {
            weeklySetsByGroup[group] = (weeklySetsByGroup[group] ?? 0) + 1;
          }
        }
      }
    }

    // ── 10. Current muscle stats ───────────────────────────────────────────────
    const { data: currentStats } = await admin
      .from('muscle_stats')
      .select('muscle_group, current_stat, all_time_max, last_trained_at')
      .eq('user_id', userId);

    const statMap: Record<string, { current: number; max: number; lastTrained: string | null }> = {};
    for (const s of currentStats ?? []) {
      statMap[s.muscle_group] = {
        current:     Number(s.current_stat),
        max:         Number(s.all_time_max),
        lastTrained: s.last_trained_at,
      };
    }

    // ── 11. Initialize from onboarding strength test (first run only) ──────────
    const hasAnyStats = currentStats && currentStats.length > 0;
    if (!hasAnyStats) {
      const { data: initStr } = await admin
        .from('initial_strength')
        .select('push_weight_kg, push_reps, pull_weight_kg, pull_reps, legs_weight_kg, legs_reps')
        .eq('user_id', userId)
        .single();

      if (initStr) {
        const W23  = Math.pow(weightKg, 2 / 3);
        const hAdj = 1 + (heightM - 1.75);

        const calcSstart = (wt: number | null, reps: number | null): number => {
          if (!wt || !reps) return 0;
          const e1rm = wt * (1 + reps / 30);
          return (e1rm / (W23 * hAdj)) * params.mBase;
        };

        const sStartPush = calcSstart(initStr.push_weight_kg, initStr.push_reps);
        const sStartPull = calcSstart(initStr.pull_weight_kg, initStr.pull_reps);
        const sStartLegs = calcSstart(initStr.legs_weight_kg, initStr.legs_reps);

        const SCALE = 10;
        statMap['chest']     = { current: sStartPush * SCALE,                          max: sStartPush * SCALE,                          lastTrained: null };
        statMap['back']      = { current: sStartPull * SCALE,                          max: sStartPull * SCALE,                          lastTrained: null };
        statMap['shoulders'] = { current: sStartPush * SCALE * 0.7,                    max: sStartPush * SCALE * 0.7,                    lastTrained: null };
        statMap['arms']      = { current: (sStartPush + sStartPull) / 2 * SCALE * 0.7, max: (sStartPush + sStartPull) / 2 * SCALE * 0.7, lastTrained: null };
        statMap['legs']      = { current: sStartLegs * SCALE,                          max: sStartLegs * SCALE,                          lastTrained: null };
        statMap['core']      = { current: sStartPush * SCALE * 0.5,                    max: sStartPush * SCALE * 0.5,                    lastTrained: null };
      }
    }

    // ── 12. Compute stimulus per muscle group (today only) ────────────────────
    const stimulusMap: Record<string, number> = {};
    let totalStimulus = 0;
    const trainedGroups = new Set<string>();

    for (const workout of todayWorkouts) {
      for (const we of workout.workout_exercises) {
        const exId = we.exercise_id;
        if (!exId) continue;

        const groups      = getMuscleGroups(exId, we.exercise_target);
        const e1RMActive  = e1RMMap[exId] ?? 50;

        for (const set of we.workout_sets) {
          if (!set.is_completed) continue;
          if (set.set_type === 'warmup') continue;

          const eMod      = eModFromRIR(set.rir, set.set_type);
          const loadRatio = set.weight_kg > 0 ? set.weight_kg / e1RMActive : 0.7;
          // Stset = ln(Load/e1RM × Reps × Emod + 1)
          const stSet     = Math.log(loadRatio * set.reps * eMod + 1);
          totalStimulus  += stSet;

          for (const group of groups) {
            stimulusMap[group] = (stimulusMap[group] ?? 0) + stSet;
            trainedGroups.add(group);
          }
        }
      }
    }

    // ── 13. Apply decay + growth (RPG engine) ─────────────────────────────────
    const GRACE_DAYS = 5;
    const newStatMap: Record<string, number> = {};

    for (const group of ALL_GROUPS) {
      const existing = statMap[group] ?? { current: 0, max: 0, lastTrained: null };
      let stat = existing.current;

      // Decay begins after 5-day grace period
      if (existing.lastTrained) {
        const daysSince = (Date.now() - new Date(existing.lastTrained).getTime()) / 86_400_000;
        if (daysSince > GRACE_DAYS) {
          const decayDays = Math.floor(daysSince - GRACE_DAYS);
          stat *= Math.pow(1 - params.decayRate, decayDays);
        }
      }

      // Growth: Snew = Sold + ΣStset × Rtotal × Kadapt × volumeEfficiency
      const stimulus = stimulusMap[group] ?? 0;
      if (stimulus > 0) {
        // Muscle memory: double kAdapt when recovering back toward all-time peak
        const isRecovering = existing.max > 0 && stat < existing.max * 0.9;
        const kEff    = isRecovering ? params.kAdapt * 2 : params.kAdapt;
        // Diminishing returns when weekly volume exceeds optimal zone
        const volEff  = weeklyVolumeEfficiency(weeklySetsByGroup[group] ?? 0);
        stat += stimulus * rTotal * kEff * volEff;
      }

      newStatMap[group] = Math.max(0, stat);
    }

    // ── 14. Upsert muscle stats ───────────────────────────────────────────────
    await admin.from('muscle_stats').upsert(
      ALL_GROUPS.map(group => ({
        user_id:         userId,
        muscle_group:    group,
        current_stat:    newStatMap[group],
        all_time_max:    Math.max(newStatMap[group], statMap[group]?.max ?? 0),
        last_trained_at: trainedGroups.has(group)
          ? nowIso
          : (statMap[group]?.lastTrained ?? null),
        updated_at: nowIso,
      })),
      { onConflict: 'user_id,muscle_group' },
    );

    // ── 15. Body part scores (power-law display values, unbounded) ────────────
    const bodyPartScores: Record<string, number> = {};
    for (const group of ALL_GROUPS) {
      bodyPartScores[group] = statToDisplay(newStatMap[group]);
    }

    // ── 16. Sub-scores (0–100 daily performance, scale unchanged) ────────────

    // Workout score
    const workoutScore = todayWorkouts.length > 0
      ? Math.min(100, Math.round((totalStimulus / params.expectedStim) * 100))
      : 0;

    // Sleep score: hours (60%) + quality (40%)
    const hoursScore =
      sleepHours >= 8 ? 100 : sleepHours >= 7 ? 90 : sleepHours >= 6 ? 70 : sleepHours >= 5 ? 45 : 20;
    const qualityScore =
      sleepQuality === 'excellent' || sleepQuality === 'good' ? 100
      : sleepQuality === 'okay' ? 60 : 20;
    const sleepScore = lastSleep ? Math.round(0.6 * hoursScore + 0.4 * qualityScore) : 0;

    // Diet score: protein (60%) + calorie adherence (40%)
    const proteinScore = Math.min(100, Math.round((totalProtein / proteinGoal) * 100));
    const calScore = totalCalories > 0
      ? Math.max(0, Math.round(100 - Math.abs(totalCalories / calTarget - 1) * 150))
      : 0;
    const dietScore = (dietLogs?.length ?? 0) > 0
      ? Math.round(0.6 * proteinScore + 0.4 * calScore)
      : 0;

    // Total score: geometric mean of body part display values ("Leg Day Guard")
    const bpValues  = ALL_GROUPS.map(g => Math.max(1, bodyPartScores[g]));
    const totalScore = Math.round(
      Math.pow(bpValues.reduce((p, v) => p * v, 1), 1 / bpValues.length)
    );

    // Balance score — coefficient of variation, scale-independent
    const avgBp   = bpValues.reduce((s, v) => s + v, 0) / bpValues.length;
    const stdDev  = Math.sqrt(bpValues.reduce((s, v) => s + (v - avgBp) ** 2, 0) / bpValues.length);
    const relCV   = avgBp > 0 ? stdDev / avgBp : 0;
    const balanceScore = Math.max(0, Math.round(100 - relCV * 100));

    // ── 17. Insights ──────────────────────────────────────────────────────────
    const insights: { type: string; message: string }[] = [];

    const sortedGroups = ALL_GROUPS
      .map(g => ({ group: g, score: bodyPartScores[g] }))
      .sort((a, b) => a.score - b.score);

    const weakest   = sortedGroups[0];
    const strongest = sortedGroups[sortedGroups.length - 1];

    if (weakest.score < avgBp * 0.65) {
      insights.push({
        type: 'warning',
        message: `${weakest.group.charAt(0).toUpperCase() + weakest.group.slice(1)} is lagging behind. Training it more will improve your overall score.`,
      });
    }
    if (workoutScore >= 80) {
      insights.push({ type: 'success', message: 'Great workout today! Prioritise recovery and sleep.' });
    } else if (workoutScore === 0) {
      insights.push({ type: 'info', message: 'Rest day. Muscle growth happens during recovery.' });
    }
    if (proteinScore < 60 && (dietLogs?.length ?? 0) > 0) {
      insights.push({ type: 'warning', message: `Protein intake is low. Aim for ${Math.round(proteinGoal)}g today.` });
    }
    if (sleepHours < 6 && lastSleep) {
      insights.push({ type: 'warning', message: 'Poor sleep reduces muscle synthesis. Try to get 7–8 hours.' });
    }
    if (balanceScore < 60 && strongest.score > 0) {
      insights.push({
        type: 'info',
        message: `${strongest.group.charAt(0).toUpperCase() + strongest.group.slice(1)} is your best group. Focus on weaker areas to raise your Body Score.`,
      });
    }

    const overVolumeMuscles = ALL_GROUPS.filter(g => (weeklySetsByGroup[g] ?? 0) > 20);
    if (overVolumeMuscles.length > 0) {
      insights.push({
        type: 'info',
        message: `High weekly volume on ${overVolumeMuscles.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ')}. Consider a deload next session for better recovery.`,
      });
    }

    // ── 18. Upsert daily_scores ───────────────────────────────────────────────
    const { error: upsertErr } = await admin.from('daily_scores').upsert(
      {
        user_id:          userId,
        date:             today,
        workout_score:    workoutScore,
        diet_score:       dietScore,
        sleep_score:      sleepScore,
        balance_score:    balanceScore,
        total_score:      totalScore,
        body_part_scores: bodyPartScores,
        insights,
      },
      { onConflict: 'user_id,date' },
    );

    if (upsertErr) {
      console.error('[calculate-scores] upsert error:', upsertErr);
      return jsonResponse({ error: 'Failed to save scores' }, 500);
    }

    return jsonResponse({
      total_score:      totalScore,
      workout_score:    workoutScore,
      diet_score:       dietScore,
      sleep_score:      sleepScore,
      balance_score:    balanceScore,
      body_part_scores: bodyPartScores,
      insights,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[calculate-scores]', msg);
    return jsonResponse({ error: msg }, 500);
  }
});
