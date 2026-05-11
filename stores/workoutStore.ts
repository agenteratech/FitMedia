import { create } from 'zustand';

export type WorkoutSet = {
  setNumber: number;
  weight: number;
  reps: number;
  rir?: number | null;
  isPR?: boolean;
  completed?: boolean;
};

export type WorkoutExerciseEntry = {
  exerciseId: string;
  name: string;
  primaryMuscle?: string | string[] | null;
  orderIndex: number;
  sets: WorkoutSet[];
};

export type WorkoutState = {
  workoutType: string;
  startedAt: string | null;
  exercises: WorkoutExerciseEntry[];
  setWorkoutType: (type: string) => void;
  setStartedAt: (value: string) => void;
  upsertExercise: (entry: WorkoutExerciseEntry) => void;
  reset: () => void;
};

export const useWorkoutStore = create<WorkoutState>((set) => ({
  workoutType: 'Workout',
  startedAt: null,
  exercises: [],
  setWorkoutType: (type) => set({ workoutType: type }),
  setStartedAt: (value) => set({ startedAt: value }),
  upsertExercise: (entry) =>
    set((state) => {
      const existingIndex = state.exercises.findIndex(
        (exercise) => exercise.exerciseId === entry.exerciseId
      );

      if (existingIndex >= 0) {
        const next = [...state.exercises];
        next[existingIndex] = entry;
        return { exercises: next };
      }

      return { exercises: [...state.exercises, entry] };
    }),
  reset: () => set({ workoutType: 'Workout', startedAt: null, exercises: [] }),
}));
