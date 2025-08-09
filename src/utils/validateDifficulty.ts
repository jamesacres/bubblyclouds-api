import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';

export const validateDifficulty = (difficulty: string) =>
  Object.values(SudokuQQWingDifficulty).includes(difficulty as SudokuQQWingDifficulty);
