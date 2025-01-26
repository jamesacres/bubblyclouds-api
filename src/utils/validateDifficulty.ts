import { Difficulty } from '@/types/enums/difficulty.enum';

export const validateDifficulty = (difficulty: string) =>
  Object.values(Difficulty).includes(difficulty as Difficulty);
