import { Difficulty } from '@/types/enums/difficulty.enum';
import { Injectable } from '@nestjs/common';
import { Sudoku } from './dto/sudoku';
import { qqwing } from '@/lib/qqwing';
import { SudokuRepository } from './repository/sudoku.repository';

@Injectable()
export class SudokuService {
  constructor(private readonly sudokuRepository: SudokuRepository) {}

  async sudokuOfTheDay(difficulty: Difficulty): Promise<Sudoku> {
    // Look up to see if sudoku of this difficulty has already been generated today
    // If it hasn't, generate and return it
    let sudoku = await this.sudokuRepository.findSudokuOfTheDay(difficulty);
    if (!sudoku) {
      const { initial, final } = await qqwing.generate(difficulty);
      sudoku = await this.sudokuRepository.insertSudokuOfTheDay({
        difficulty,
        final,
        initial,
      });
    }
    return sudoku;
  }
}
