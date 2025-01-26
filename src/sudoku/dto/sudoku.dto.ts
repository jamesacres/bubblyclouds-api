import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SudokuDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  initial: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  final: string;
}
