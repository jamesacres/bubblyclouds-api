import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';
import { Injectable } from '@nestjs/common';
import { Sudoku } from './dto/sudoku';
import { qqwing } from '@/lib/qqwing';
import { SudokuRepository } from './repository/sudoku.repository';
import { SudokuBook } from './dto/sudoku-book';
import { SudokuBookPuzzle } from './dto/sudoku-book-puzzle';
import { SudokuBookRepository } from './repository/sudoku-book.repository';
import { generateSudokuSelection } from '@/utils/sudoku-seed-reader';
import { scrambleSudoku } from '@/utils/scrambleSudoku';

@Injectable()
export class SudokuService {
  constructor(
    private readonly sudokuRepository: SudokuRepository,
    private readonly sudokuBookRepository: SudokuBookRepository,
  ) {}

  async sudokuOfTheDay(
    difficulty: SudokuQQWingDifficulty,
    isTomorrow: boolean | undefined,
  ): Promise<Sudoku> {
    // Look up to see if sudoku of this difficulty has already been generated today
    // If it hasn't, generate and return it
    let sudoku = await this.sudokuRepository.findSudokuOfTheDay(
      difficulty,
      isTomorrow,
    );
    if (!sudoku) {
      const { initial, final } = await qqwing.generate(difficulty);
      sudoku = await this.sudokuRepository.insertSudokuOfTheDay(
        {
          difficulty,
          final,
          initial,
        },
        isTomorrow,
      );
    }
    return sudoku;
  }

  async sudokuBookOfTheMonth(
    isNextMonth: boolean | undefined,
  ): Promise<SudokuBook> {
    // Generate a book with 50 random puzzles with a bell curve difficulty distribution
    let sudokuBook =
      await this.sudokuBookRepository.findSudokuBookOfTheMonth(isNextMonth);
    if (!sudokuBook) {
      const puzzles: SudokuBookPuzzle[] = generateSudokuSelection().map(
        (puzzle) => {
          const { puzzle: initial, solution: final } = scrambleSudoku(
            puzzle.initial,
            puzzle.final,
          );
          return {
            ...puzzle,
            initial,
            final: final!,
          };
        },
      );
      sudokuBook = await this.sudokuBookRepository.insertSudokuBookOfTheMonth(
        {
          puzzles,
        },
        isNextMonth,
      );
    }
    return sudokuBook;
  }
}
