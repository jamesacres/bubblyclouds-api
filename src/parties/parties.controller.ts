import { Controller, Get, Post, Body, Query, Request } from '@nestjs/common';
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
import { RequirePermissions } from '@/decorators/require-permissions.decorator';
import { Permission } from '@/types/enums/permission.enum';
import { App } from '@/types/enums/app.enum';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';

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
  create(
    @Request() req: RequestWithUser,
    @Body() createPartyDto: CreatePartyDto,
  ): Promise<PartyDto> {
    const createdBy = req.user.sub;
    return this.partiesService.create(createPartyDto, createdBy);
  }

  @ApiOkResponse({
    description: 'Parties the user is a member of.',
    type: [PartyDto],
  })
  @ApiQuery({ name: 'app', enum: App, required: true })
  @Get()
  findAll(@Query('app') app: App): Promise<PartyDto[]> {
    return this.partiesService.findAll(app);
  }
}
