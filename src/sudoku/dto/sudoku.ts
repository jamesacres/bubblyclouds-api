import { Difficulty } from '@/types/enums/difficulty.enum';

export interface Sudoku {
  sudokuId: string;
  difficulty: Difficulty;
  initial: string;
  final: string;
  createdAt: Date;
  updatedAt: Date;
}
