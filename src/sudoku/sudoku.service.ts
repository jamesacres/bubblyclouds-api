import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';
import { Injectable } from '@nestjs/common';
import { Sudoku } from './dto/sudoku';
import { qqwing } from '@/lib/qqwing';
import { SudokuRepository } from './repository/sudoku.repository';

@Injectable()
export class SudokuService {
  constructor(private readonly sudokuRepository: SudokuRepository) {}

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

  async sudokuBookOfTheMonth(isTomorrow: boolean | undefined): Promise<Sudoku> {
    // Look up to see if sudoku of this difficulty has already been generated today
    // If it hasn't, generate and return it
    let sudoku =
      await this.sudokuBookRepository.findSudokuBookOfTheMonth(isTomorrow);
    if (!sudoku) {
      // TODO select random seeds from each difficulty
      // TODO shuffle each seed
      // https://mathwithbaddrawings.com/2017/01/04/1-2-trillion-ways-to-play-the-same-sudoku/
      // https://www.sudopedia.org/wiki/Scramble
      // Rotate, Mirror
      // Swap bands, stacks
      // Swap rows and columns within bands and stacks respectively
      // Swap all of one number with all of another number (e.g. swap all 1s with 9s)
      sudoku = await this.sudokuBookRepository.insertSudokuBookOfTheMonth(
        {
          // TODO
        },
        isTomorrow,
      );
    }
    return sudoku;
  }
}
