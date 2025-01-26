import { Difficulty } from '@/types/enums/difficulty.enum';
import { Injectable } from '@nestjs/common';
import { Sudoku } from './dto/sudoku';
import { qqwing } from '@/lib/qqwing';

@Injectable()
export class SudokuService {
  constructor() {}

  async sudokuOfTheDay(difficulty: Difficulty): Promise<Sudoku> {
    const { initial, final } = await qqwing.generate(difficulty);
    return { initial, final };
  }
}
