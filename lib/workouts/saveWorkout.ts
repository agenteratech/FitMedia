import { supabase } from '../supabase';
import type { WorkoutExerciseEntry } from '../../stores/workoutStore';
import { normalizeMuscleList, primaryMuscleLabel } from './muscles';

// Custom exercises have client-generated IDs (not real DB UUIDs). Storing them
// in the UUID column would cause a Postgres type error, so we pass null instead
// and rely on exercise_name + exercise_target for identity and muscle mapping.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRealExerciseId = (id: string) => UUID_RE.test(id);

const classifyHit = (sets: number): 'high' | 'medium' | 'low' => {
  if (sets >= 8) return 'high';
  if (sets >= 4) return 'medium';
  return 'low';
};

export interface SaveWorkoutParams {
  userId: string;
  workoutType: string;
  startedAt: string | null;
  exercises: WorkoutExerciseEntry[];
}

export async function saveWorkout(params: SaveWorkoutParams): Promise<{ error: string | null }> {
  const { userId, workoutType, startedAt, exercises } = params;

  const completedSets = exercises.flatMap((ex) =>
    ex.sets.filter((s) => s.completed && s.weight && s.reps)
  );
  const totalVolume = completedSets.reduce((t, s) => t + s.weight * s.reps, 0);
  const totalSets = completedSets.length;
  const totalExercises = exercises.filter((ex) =>
    ex.sets.some((s) => s.completed && s.weight && s.reps)
  ).length;
  const durationMinutes = startedAt
    ? Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60000))
    : null;

  const bodyPartCounts: Record<string, number> = {};
  exercises.forEach((ex) => {
    const done = ex.sets.filter((s) => s.completed && s.weight && s.reps);
    if (!done.length) return;
    const key = primaryMuscleLabel(ex.primaryMuscle) ?? 'unknown';
    bodyPartCounts[key] = (bodyPartCounts[key] ?? 0) + done.length;
  });
  const bodyPartsHit = Object.fromEntries(
    Object.entries(bodyPartCounts).map(([m, c]) => [m, classifyHit(c)])
  );

  let workoutId: string | null = null;
  const rollback = async () => {
    if (workoutId) await supabase.from('workouts').delete().eq('id', workoutId);
  };

  try {
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        workout_type: workoutType,
        duration_minutes: durationMinutes ?? undefined,
        total_volume_kg: totalVolume,
        total_sets: totalSets,
        total_exercises: totalExercises,
        body_parts_hit: bodyPartsHit,
        started_at: startedAt ?? undefined,
      })
      .select()
      .single();

    if (workoutError || !workout) throw new Error(workoutError?.message ?? 'Unable to save workout.');
    workoutId = workout.id;

    for (const [index, exercise] of exercises.entries()) {
      const primaryTarget = normalizeMuscleList(exercise.primaryMuscle)[0] ?? null;
      const dbExerciseId = isRealExerciseId(exercise.exerciseId) ? exercise.exerciseId : null;

      const { data: workoutExercise, error: exerciseError } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workout.id,
          exercise_id: dbExerciseId,
          exercise_name: exercise.name,
          exercise_target: primaryTarget ?? undefined,
          order_index: index,
        })
        .select()
        .single();

      if (exerciseError || !workoutExercise) {
        throw new Error(exerciseError?.message ?? 'Unable to save exercises.');
      }

      await saveWorkoutSetsAndPrs(workoutExercise.id, workout.id, userId, exercise);
    }

    return { error: null };
  } catch (err) {
    await rollback();
    return { error: err instanceof Error ? err.message : 'Something went wrong.' };
  }
}

async function saveWorkoutSetsAndPrs(
  workoutExerciseId: string,
  workoutId: string,
  userId: string,
  exercise: WorkoutExerciseEntry
) {
  for (const set of exercise.sets) {
    if (!set.completed || !set.weight || !set.reps) continue;

    const { error: setError } = await supabase.from('workout_sets').insert({
      workout_exercise_id: workoutExerciseId,
      set_number: set.setNumber,
      weight_kg: set.weight,
      reps: set.reps,
      rir: set.rir ?? null,
      is_pr: set.isPR ?? false,
      is_completed: true,
    });
    if (setError) throw new Error(setError.message);

    // PR inserts are best-effort: a missed record isn't worth losing the workout.
    // Skip for custom exercises — they have no real exercise_id to reference.
    if (set.isPR && isRealExerciseId(exercise.exerciseId)) {
      await supabase.from('personal_records').insert({
        user_id: userId,
        exercise_id: exercise.exerciseId,
        weight_kg: set.weight,
        reps: set.reps,
        workout_id: workoutId,
      });
    }
  }
}
