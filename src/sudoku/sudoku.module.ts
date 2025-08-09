import { Module } from '@nestjs/common';
import { SudokuService } from './sudoku.service';
import { SudokuController } from './sudoku.controller';
import { SudokuRepository } from './repository/sudoku.repository';
import { SudokuBookRepository } from './repository/sudoku-book.repository';

@Module({
  controllers: [SudokuController],
  providers: [SudokuRepository, SudokuBookRepository, SudokuService],
})
export class SudokuModule {}
