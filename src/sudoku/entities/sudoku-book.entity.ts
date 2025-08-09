import { SudokuBook } from '../dto/sudoku-book';
import { SudokuBookPuzzle } from '../dto/sudoku-book-puzzle';

export class SudokuBookEntity implements SudokuBook {
  sudokuBookId: string;
  puzzles: SudokuBookPuzzle[];
  expiresAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    sudokuBookId,
    puzzles,
    expiresAt,
    createdAt,
    updatedAt,
  }: SudokuBook) {
    this.sudokuBookId = sudokuBookId;
    this.puzzles = puzzles;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
