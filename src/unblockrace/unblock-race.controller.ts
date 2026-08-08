import { ApiKey } from '@/decorators/api-key.decorator';
import { Controller, Get, ParseBoolPipe, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UnblockRace } from './dto/unblock-race';
import { UnblockRaceCollection } from './dto/unblock-race-collection';
import { UnblockRaceCollectionDto } from './dto/unblock-race-collection.dto';
import { UnblockRaceDto } from './dto/unblock-race.dto';
import { UnblockRaceService } from './unblock-race.service';

@ApiTags('unblockRace')
@ApiBearerAuth('access-token')
@Controller('unblockRace')
export class UnblockRaceController {
  constructor(private readonly unblockRaceService: UnblockRaceService) {}

  @ApiOkResponse({
    description:
      "The day's five puzzles, in increasing difficulty. One record covers every difficulty.",
    type: UnblockRaceDto,
  })
  @ApiQuery({ name: 'isTomorrow', type: Boolean, required: false })
  @Get('ofTheDay')
  @ApiKey()
  async ofTheDay(
    @Query('isTomorrow', new ParseBoolPipe({ optional: true }))
    isTomorrow: boolean | undefined,
  ): Promise<UnblockRace> {
    return this.unblockRaceService.unblockRaceOfTheDay(isTomorrow);
  }

  @ApiOkResponse({
    description: 'Unblock race collection of the month.',
    type: UnblockRaceCollectionDto,
  })
  @ApiQuery({ name: 'isNextMonth', type: Boolean, required: false })
  @Get('collectionOfTheMonth')
  @ApiKey()
  async collectionOfTheMonth(
    @Query('isNextMonth', new ParseBoolPipe({ optional: true }))
    isNextMonth: boolean | undefined,
  ): Promise<UnblockRaceCollection> {
    return this.unblockRaceService.unblockRaceCollectionOfTheMonth(isNextMonth);
  }
}
