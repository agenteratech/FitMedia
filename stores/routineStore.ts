import { create } from 'zustand';

export type RoutineExerciseDraft = {
  exerciseId: string;
  name: string;
  order: number;
  defaultSets: number;
  defaultReps: number;
};

export type RoutineDraftState = {
  name: string;
  exercises: RoutineExerciseDraft[];
  setName: (name: string) => void;
  /** Bulk-replace exercises (used when loading an existing routine for editing). */
  setExercises: (exercises: RoutineExerciseDraft[]) => void;
  addExercise: (exercise: Omit<RoutineExerciseDraft, 'order'>) => void;
  removeExercise: (exerciseId: string) => void;
  /** Patch sets or reps for a specific exercise. */
  updateExercise: (
    exerciseId: string,
    patch: Partial<Pick<RoutineExerciseDraft, 'defaultSets' | 'defaultReps'>>,
  ) => void;
  /** Move an exercise one position up or down, keeping order values sequential. */
  moveExercise: (exerciseId: string, direction: 'up' | 'down') => void;
  reset: () => void;
};

export const useRoutineStore = create<RoutineDraftState>((set) => ({
  name: '',
  exercises: [],

  setName: (name) => set({ name }),

  setExercises: (exercises) => set({ exercises }),

  addExercise: (exercise) =>
    set((state) => {
      if (state.exercises.some((item) => item.exerciseId === exercise.exerciseId)) {
        return state;
      }
      const order = state.exercises.length;
      return { exercises: [...state.exercises, { ...exercise, order }] };
    }),

  removeExercise: (exerciseId) =>
    set((state) => ({
      exercises: state.exercises
        .filter((item) => item.exerciseId !== exerciseId)
        .map((item, index) => ({ ...item, order: index })),
    })),

  updateExercise: (exerciseId, patch) =>
    set((state) => ({
      exercises: state.exercises.map((item) =>
        item.exerciseId === exerciseId ? { ...item, ...patch } : item,
      ),
    })),

  moveExercise: (exerciseId, direction) =>
    set((state) => {
      const idx = state.exercises.findIndex((e) => e.exerciseId === exerciseId);
      if (idx < 0) return state;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= state.exercises.length) return state;
      const next = [...state.exercises];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return { exercises: next.map((e, i) => ({ ...e, order: i })) };
    }),

  reset: () => set({ name: '', exercises: [] }),
}));
