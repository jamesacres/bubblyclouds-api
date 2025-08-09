import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';

export interface Sudoku {
  sudokuId: string;
  difficulty: SudokuQQWingDifficulty;
  initial: string;
  final: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
