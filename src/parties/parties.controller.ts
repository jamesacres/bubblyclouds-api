import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PartiesService } from './parties.service';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PartyDto } from './dto/party.dto';

@ApiTags('parties')
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @ApiCreatedResponse({
    description: 'Party successfully created.',
    type: PartyDto,
  })
  @Post()
  create(@Body() createPartyDto: CreatePartyDto) {
    return this.partiesService.create(createPartyDto);
  }

  @ApiOkResponse({
    description: 'List of Parties.',
    type: [PartyDto],
  })
  @Get()
  findAll() {
    return this.partiesService.findAll();
  }

  @ApiOkResponse({
    description: 'The Party requested.',
    type: PartyDto,
  })
  @ApiNotFoundResponse({ description: 'Party not found.' })
  @Get(':partyId')
  findOne(@Param('partyId') partyId: string) {
    return this.partiesService.findOne(partyId);
  }

  @ApiOkResponse({
    description: 'The updated Party.',
    type: PartyDto,
  })
  @ApiNotFoundResponse({ description: 'Party not found.' })
  @Patch(':partyId')
  update(
    @Param('partyId') partyId: string,
    @Body() updatePartyDto: UpdatePartyDto,
  ) {
    return this.partiesService.update(partyId, updatePartyDto);
  }

  @ApiNoContentResponse({
    description: 'Party removed.',
  })
  @ApiNotFoundResponse({ description: 'Party not found.' })
  @Delete(':partyId')
  remove(@Param('partyId') partyId: string) {
    return this.partiesService.remove(partyId);
  }
}
