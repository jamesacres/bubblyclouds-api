import { Difficulty } from '@/types/enums/difficulty.enum';

export interface Sudoku {
  sudokuId: string;
  difficulty: Difficulty;
  initial: string;
  final: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
