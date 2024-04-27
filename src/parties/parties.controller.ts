import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  BadRequestException,
} from '@nestjs/common';
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
import { validateApp } from '@/utils/validateApp';

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
    if (!validateApp(createPartyDto.appId)) {
      throw new BadRequestException('Invalid app');
    }
    const createdBy = req.user.sub;
    return this.partiesService.create(createPartyDto, createdBy);
  }

  @ApiOkResponse({
    description: 'Parties the user is a member of.',
    type: [PartyDto],
  })
  @ApiQuery({ name: 'app', enum: App, required: true })
  @Get()
  findAll(
    @Request() req: RequestWithUser,
    @Query('app') app: App,
  ): Promise<PartyDto[]> {
    if (!validateApp(app)) {
      throw new BadRequestException('Invalid app');
    }
    return this.partiesService.findAllForUser(req.user.sub, app);
  }
}
