export const workoutCategories = [
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Legs' },
  { id: 'full_body', label: 'Full Body' },
  { id: 'chest_triceps', label: 'Chest & Triceps' },
  { id: 'back_biceps', label: 'Back & Biceps' },
  { id: 'shoulders_arms', label: 'Shoulders & Arms' },
  { id: 'upper_body', label: 'Upper Body' },
] as const;

export type WorkoutCategoryId = (typeof workoutCategories)[number]['id'];
