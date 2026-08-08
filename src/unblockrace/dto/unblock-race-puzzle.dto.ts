import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsString, Length } from 'class-validator';
import { UnblockRacePuzzle } from './unblock-race-puzzle';

export class UnblockRacePuzzleDto implements UnblockRacePuzzle {
  @ApiProperty({
    description:
      "36 characters describing a 6x6 grid, row major: 'o' empty, 'x' wall, 'A' the escaping car, other letters are vehicles.",
    example: 'oBBJCCoDDJKLoAAJKLEEIoooHoIooxHGGGoo',
  })
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  board: string;

  @ApiProperty({ description: 'Minimum number of moves required to solve.' })
  @IsInt()
  moves: number;

  @ApiProperty({ enum: UnblockRaceDifficulty })
  @IsEnum(UnblockRaceDifficulty)
  difficulty: UnblockRaceDifficulty;
}
