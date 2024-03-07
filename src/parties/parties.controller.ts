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

@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Post()
  create(@Body() createPartyDto: CreatePartyDto) {
    return this.partiesService.create(createPartyDto);
  }

  @Get()
  findAll() {
    return this.partiesService.findAll();
  }

  @Get(':partyId')
  findOne(@Param('partyId') partyId: string) {
    return this.partiesService.findOne(partyId);
  }

  @Patch(':partyId')
  update(
    @Param('partyId') partyId: string,
    @Body() updatePartyDto: UpdatePartyDto,
  ) {
    return this.partiesService.update(partyId, updatePartyDto);
  }

  @Delete(':partyId')
  remove(@Param('partyId') partyId: string) {
    return this.partiesService.remove(partyId);
  }
}
