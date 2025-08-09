import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';
import { Sudoku } from '../dto/sudoku';

export class SudokuEntity implements Sudoku {
  difficulty: SudokuQQWingDifficulty;
  final: string;
  sudokuId: string;
  initial: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    sudokuId,
    difficulty,
    initial,
    final,
    expiresAt,
    createdAt,
    updatedAt,
  }: Sudoku) {
    this.difficulty = difficulty;
    this.final = final;
    this.sudokuId = sudokuId;
    this.initial = initial;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
