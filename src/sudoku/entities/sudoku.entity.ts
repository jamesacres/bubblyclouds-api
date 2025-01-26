import { Difficulty } from '@/types/enums/difficulty.enum';
import { Sudoku } from '../dto/sudoku';

export class SudokuEntity implements Sudoku {
  difficulty: Difficulty;
  final: string;
  sudokuId: string;
  initial: string;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    sudokuId,
    difficulty,
    initial,
    final,
    createdAt,
    updatedAt,
  }: Sudoku) {
    this.difficulty = difficulty;
    this.final = final;
    this.sudokuId = sudokuId;
    this.initial = initial;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
