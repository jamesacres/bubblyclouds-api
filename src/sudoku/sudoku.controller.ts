import {
  Controller,
  Get,
  Request,
  BadRequestException,
  Query,
  ParseBoolPipe,
} from '@nestjs/common';
import { SudokuService } from './sudoku.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';

import { SudokuDto } from './dto/sudoku.dto';
import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';
import { validateDifficulty } from '@/utils/validateDifficulty';
import { Sudoku } from './dto/sudoku';
import { ApiKey } from '@/decorators/api-key.decorator';

@ApiTags('sudoku')
@ApiBearerAuth('access-token')
@Controller('sudoku')
export class SudokuController {
  constructor(private readonly sudokuService: SudokuService) {}

  @ApiOkResponse({
    description: 'Sudoku of the day.',
    type: [SudokuDto],
  })
  @ApiQuery({
    name: 'difficulty',
    enum: SudokuQQWingDifficulty,
    required: true,
  })
  @ApiQuery({ name: 'isTomorrow', type: Boolean, required: false })
  @Get('ofTheDay')
  @ApiKey()
  async ofTheDay(
    @Request() req: RequestWithUser,
    @Query('difficulty') difficulty: SudokuQQWingDifficulty,
    @Query('isTomorrow', new ParseBoolPipe({ optional: true }))
    isTomorrow: boolean | undefined,
  ): Promise<Sudoku> {
    if (!validateDifficulty(difficulty)) {
      throw new BadRequestException('Invalid difficulty');
    }
    return this.sudokuService.sudokuOfTheDay(difficulty, isTomorrow);
  }
}
