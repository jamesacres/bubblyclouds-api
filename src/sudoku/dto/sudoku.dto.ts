import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class SudokuDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sudokuId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  difficulty: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  initial: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  final: string;

  @ApiProperty()
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @IsDate()
  updatedAt: Date;
}
