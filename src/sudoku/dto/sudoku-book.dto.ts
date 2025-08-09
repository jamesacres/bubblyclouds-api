import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SudokuBook } from './sudoku-book';
import { SudokuBookPuzzle } from './sudoku-book-puzzle';
import { SudokuBookPuzzleDto } from './sudoku-book-puzzle.dto';

export class SudokuBookDto implements SudokuBook {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sudokuBookId: string;

  @ApiProperty({ type: [SudokuBookPuzzleDto] })
  @IsNotEmpty()
  @IsArray()
  puzzles: SudokuBookPuzzle[];

  @ApiPropertyOptional()
  @IsOptional()
  // DatePipe transforms string to date
  @IsDate()
  expiresAt?: Date;

  @ApiProperty()
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @IsDate()
  updatedAt: Date;
}
