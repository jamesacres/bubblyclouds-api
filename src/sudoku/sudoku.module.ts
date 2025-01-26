import { Module } from '@nestjs/common';
import { SudokuService } from './sudoku.service';
import { SudokuController } from './sudoku.controller';
import { SudokuRepository } from './repository/sudoku.repository';

@Module({
  controllers: [SudokuController],
  providers: [SudokuRepository, SudokuService],
})
export class SudokuModule {}
