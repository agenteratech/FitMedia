import { useMemo } from 'react';
import type { DailyScore } from './useDailyScore';
import { colors } from '../constants/colors';

export type BodyPartScores = {
  chest: number;
  back: number;
  arms: number;
  shoulders: number;
  legs: number;
};

const defaultScores: BodyPartScores = {
  chest: 0,
  back: 0,
  arms: 0,
  shoulders: 0,
  legs: 0,
};

export function useBodyPartScores(score: DailyScore | null) {
  return useMemo(() => {
    if (!score) return defaultScores;

    return {
      chest: Number(score.body_part_scores?.chest ?? 0),
      back: Number(score.body_part_scores?.back ?? 0),
      arms: Number(score.body_part_scores?.arms ?? 0),
      shoulders: Number(score.body_part_scores?.shoulders ?? 0),
      legs: Number(score.body_part_scores?.legs ?? 0),
    };
  }, [score]);
}

export const colorForScore = (value: number) => {
  if (value >= 60) return colors.green;
  if (value >= 35) return colors.orange;
  return colors.red;
};
