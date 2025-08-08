import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
