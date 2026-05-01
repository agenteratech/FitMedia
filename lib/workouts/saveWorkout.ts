import { supabase } from '../supabase';
import type { WorkoutExerciseEntry } from '../../stores/workoutStore';

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
    const key = ex.primaryMuscle ?? 'unknown';
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
      const { data: workoutExercise, error: exerciseError } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workout.id,
          exercise_id: exercise.exerciseId,
          exercise_name: exercise.name,
          exercise_target: exercise.primaryMuscle ?? undefined,
          order_index: index,
        })
        .select()
        .single();

      if (exerciseError || !workoutExercise)
        throw new Error(exerciseError?.message ?? 'Unable to save exercises.');

      for (const set of exercise.sets) {
        if (!set.completed || !set.weight || !set.reps) continue;

        const { error: setError } = await supabase.from('workout_sets').insert({
          workout_exercise_id: workoutExercise.id,
          set_number: set.setNumber,
          weight_kg: set.weight,
          reps: set.reps,
          is_pr: set.isPR ?? false,
          is_completed: true,
        });
        if (setError) throw new Error(setError.message);

        // PR inserts are best-effort — a missed record isn't worth losing the workout
        if (set.isPR) {
          await supabase.from('personal_records').insert({
            user_id: userId,
            exercise_id: exercise.exerciseId,
            weight_kg: set.weight,
            reps: set.reps,
            workout_id: workout.id,
          });
        }
      }
    }

    return { error: null };
  } catch (err) {
    await rollback();
    return { error: err instanceof Error ? err.message : 'Something went wrong.' };
  }
}
