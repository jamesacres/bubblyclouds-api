import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';
import { Injectable } from '@nestjs/common';
import { Sudoku } from './dto/sudoku';
import { qqwing } from '@/lib/qqwing';
import { SudokuRepository } from './repository/sudoku.repository';
import { SudokuBook } from './dto/sudoku-book';
import { SudokuBookPuzzle } from './dto/sudoku-book-puzzle';
import { SudokuBookRepository } from './repository/sudoku-book.repository';

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
    // Look up to see if sudoku of this difficulty has already been generated today
    // If it hasn't, generate and return it
    let sudokuBook =
      await this.sudokuBookRepository.findSudokuBookOfTheMonth(isNextMonth);
    if (!sudokuBook) {
      const puzzles: SudokuBookPuzzle[] = [];
      // TODO select random seeds from each difficulty
      // TODO shuffle each seed
      // https://mathwithbaddrawings.com/2017/01/04/1-2-trillion-ways-to-play-the-same-sudoku/
      // https://www.sudopedia.org/wiki/Scramble
      // Rotate, Mirror
      // Swap bands, stacks
      // Swap rows and columns within bands and stacks respectively
      // Swap all of one number with all of another number (e.g. swap all 1s with 9s)
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
