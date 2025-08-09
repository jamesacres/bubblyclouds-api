import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SudokuCoachPuzzleDifficulty } from '@/types/enums/difficulty.enum';
import { SudokuBookPuzzle } from './sudoku-book-puzzle';

class DifficultyCountDto {
  @ApiProperty()
  @IsNumber()
  givens: number;

  @ApiProperty()
  @IsNumber()
  basic: number;

  @ApiProperty()
  @IsNumber()
  simple: number;

  @ApiProperty()
  @IsNumber()
  advanced: number;

  @ApiProperty()
  @IsNumber()
  moreAdvanced: number;

  @ApiProperty()
  @IsNumber()
  hard: number;

  @ApiProperty()
  @IsNumber()
  brutal: number;
}

class DifficultyDto {
  @ApiProperty({ enum: SudokuCoachPuzzleDifficulty })
  @IsEnum(SudokuCoachPuzzleDifficulty)
  coach: SudokuCoachPuzzleDifficulty;

  @ApiProperty()
  @IsNumber()
  sudokuExplainer: number;

  @ApiProperty()
  @IsNumber()
  hoDoKu: number;

  @ApiProperty()
  @IsNumber()
  tediousPercent: number;

  @ApiProperty({ type: DifficultyCountDto })
  @ValidateNested()
  @Type(() => DifficultyCountDto)
  count: DifficultyCountDto;
}

class BasicTechniquesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lastDigit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hiddenSingleBox?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hiddenSingleLine?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hiddenSingleVariantRegion?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nakedSingle?: number;
}

class SimpleTechniquesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hiddenPair?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  lockedCandidate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hiddenTriple?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hiddenQuadruple?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nakedPair?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nakedTriple?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nakedQuadruple?: number;
}

class AdvancedTechniquesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  xWing?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  swordfish?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  skyscraper?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  twoStringKite?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  crane?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  simpleColoring?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  yWing?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  xYZWing?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  wWing?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  finnedSashimiXWing?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  emptyRectangle?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  uniqueRectangleType1?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  uniqueRectangleType2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  uniqueRectangleType3?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  uniqueRectangleType4?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  uniqueRectangleType5?: number;
}

class HardTechniquesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  finnedSashimiSwordfish?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  jellyfish?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  bugBinaryUniversalGrave?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  xChain?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  groupedXChain?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  YWing4WXYZWing?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  yWing5?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  yWing6?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  yWing7?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  yWing8?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  yWing9?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  finnedSashimiJellyfish?: number;
}

class BrutalTechniquesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  medusa3D?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  xyChain?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  alternatingInferenceChainAIC?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  groupedAlternatingInferenceChainAIC?: number;
}

class BeyondBrutalTechniquesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nishioForcingChain?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  nishioForcingNet?: number;
}

class TechniquesDto {
  @ApiPropertyOptional({ type: BasicTechniquesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BasicTechniquesDto)
  basic?: BasicTechniquesDto;

  @ApiPropertyOptional({ type: SimpleTechniquesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleTechniquesDto)
  simple?: SimpleTechniquesDto;

  @ApiPropertyOptional({ type: AdvancedTechniquesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdvancedTechniquesDto)
  advanced?: AdvancedTechniquesDto;

  @ApiPropertyOptional({ type: HardTechniquesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HardTechniquesDto)
  hard?: HardTechniquesDto;

  @ApiPropertyOptional({ type: BrutalTechniquesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrutalTechniquesDto)
  brutal?: BrutalTechniquesDto;

  @ApiPropertyOptional({ type: BeyondBrutalTechniquesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BeyondBrutalTechniquesDto)
  beyondBrutal?: BeyondBrutalTechniquesDto;
}

export class SudokuBookPuzzleDto implements SudokuBookPuzzle {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  initial: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  final: string;

  @ApiProperty({ type: DifficultyDto })
  @ValidateNested()
  @Type(() => DifficultyDto)
  difficulty: DifficultyDto;

  @ApiProperty({ type: TechniquesDto })
  @ValidateNested()
  @Type(() => TechniquesDto)
  techniques: TechniquesDto;

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
