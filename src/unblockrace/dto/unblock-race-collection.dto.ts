import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UnblockRaceCollection } from './unblock-race-collection';
import { UnblockRacePuzzle } from './unblock-race-puzzle';
import { UnblockRacePuzzleDto } from './unblock-race-puzzle.dto';

export class UnblockRaceCollectionDto implements UnblockRaceCollection {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  unblockRaceCollectionId: string;

  @ApiProperty({ type: [UnblockRacePuzzleDto] })
  @IsNotEmpty()
  @IsArray()
  puzzles: UnblockRacePuzzle[];

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
