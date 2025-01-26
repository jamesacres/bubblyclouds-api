import { Module } from '@nestjs/common';
import { SudokuService } from './sudoku.service';
import { SudokuController } from './sudoku.controller';

@Module({
  controllers: [SudokuController],
  providers: [SudokuService],
})
export class SudokuModule {}
