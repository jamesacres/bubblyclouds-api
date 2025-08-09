import { SudokuBookPuzzle } from './sudoku-book-puzzle';

export interface SudokuBook {
  sudokuBookId: string;
  puzzles: SudokuBookPuzzle[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
