import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { CreatePartyDto } from './dto/create-party.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PartyDto } from './dto/party.dto';
import { RequirePermissions } from 'src/decorators/require-permissions.decorator';
import { Permission } from 'src/enums/permission.enum';
import { App } from 'src/enums/app.enum';

@RequirePermissions(Permission.PARTIES_WRITE)
@ApiTags('parties')
@ApiBearerAuth('access-token')
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @ApiCreatedResponse({
    description:
      'New party created, and user automatically joins the new party.',
    type: PartyDto,
  })
  @Post()
  create(@Body() createPartyDto: CreatePartyDto) {
    return this.partiesService.create(createPartyDto);
  }

  @ApiOkResponse({
    description: 'Parties the user is a member of.',
    type: [PartyDto],
  })
  @ApiQuery({ name: 'app', enum: App, required: true })
  @Get()
  findAll(@Query('app') app: App) {
    return this.partiesService.findAll(app);
  }
}
