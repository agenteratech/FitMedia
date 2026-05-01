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
  addExercise: (exercise: Omit<RoutineExerciseDraft, 'order'>) => void;
  removeExercise: (exerciseId: string) => void;
  reset: () => void;
};

export const useRoutineStore = create<RoutineDraftState>((set) => ({
  name: '',
  exercises: [],
  setName: (name) => set({ name }),
  addExercise: (exercise) =>
    set((state) => {
      if (state.exercises.some((item) => item.exerciseId === exercise.exerciseId)) {
        return state;
      }
      const order = state.exercises.length + 1;
      return { exercises: [...state.exercises, { ...exercise, order }] };
    }),
  removeExercise: (exerciseId) =>
    set((state) => ({
      exercises: state.exercises
        .filter((item) => item.exerciseId !== exerciseId)
        .map((item, index) => ({ ...item, order: index + 1 })),
    })),
  reset: () => set({ name: '', exercises: [] }),
}));
