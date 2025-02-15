import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { UpdateSessionDto } from './dto/update-session.dto';
import { RequirePermissions } from '@/decorators/require-permissions.decorator';
import { Permission } from '@/types/enums/permission.enum';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SessionWithPartiesDto } from './dto/session-with-parties.dto';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';
import { splitSessionId } from '@/utils/splitSessionId';
import { App } from '@/types/enums/app.enum';
import { SessionDto } from './dto/session.dto';
import { validateApp } from '@/utils/validateApp';
import { PartiesService } from '@/parties/parties.service';

@RequirePermissions(Permission.SESSIONS_WRITE)
@ApiTags('sessions')
@ApiBearerAuth('access-token')
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly partiesService: PartiesService,
  ) {}

  @ApiOkResponse({
    description:
      'Sessions the user has created. For some apps a different user and party can be specified to fetch their session if both users are in the party.',
    type: [SessionDto],
  })
  @ApiQuery({ name: 'app', enum: App, required: true })
  @ApiQuery({ name: 'partyId', type: 'string', required: false })
  @ApiQuery({ name: 'userId', type: 'string', required: false })
  @Get()
  async findAll(
    @Request() req: RequestWithUser,
    @Query('app') app: App,
    @Query('partyId') partyId?: string,
    @Query('userId') userId?: string,
  ): Promise<any[]> {
    if (!validateApp(app)) {
      throw new BadRequestException('Invalid app');
    }
    console.info(
      `app ${app} user ${req.user.sub} requested sessions for ${userId} in party ${partyId}`,
    );
    if (userId && userId !== req.user.sub) {
      // Optional userId allows fetching sessions of a friend
      // Check if the app allows this function
      const allowedApps = [App.SUDOKU];
      if (!allowedApps.includes(app)) {
        console.warn('App not allowed', app);
        return [];
      }
      // Check if the authorized user is a member of the party
      if (
        !partyId ||
        !(await this.partiesService.findForUser(req.user.sub, app, partyId))
      ) {
        console.warn(
          'Authorized user not member of party',
          req.user.sub,
          partyId,
        );
        return [];
      }
      // Check if the requested user is also a member of the party
      if (!(await this.partiesService.findForUser(userId, app, partyId))) {
        console.warn('Requested user not member of party', userId, partyId);
        return [];
      }
    }
    return this.sessionsService.findAllForUser(userId || req.user.sub, app);
  }

  @ApiOkResponse({
    description: 'Session for the user and all party members.',
    type: SessionWithPartiesDto,
  })
  @Get(':sessionId')
  findOne(
    @Request() req: RequestWithUser,
    @Param('sessionId') sessionId: string,
  ): Promise<SessionWithPartiesDto> {
    return this.sessionsService.findOne(sessionId, req.user.sub);
  }

  @ApiOkResponse({
    description: 'Session for the user and all party members.',
    type: SessionWithPartiesDto,
  })
  @Patch(':sessionId')
  update(
    @Request() req: RequestWithUser,
    @Param('sessionId') sessionId: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ): Promise<SessionWithPartiesDto> {
    const { app, appSessionId } = splitSessionId(sessionId);
    if (!app || !appSessionId || !updateSessionDto.state) {
      throw new BadRequestException('Invalid state');
    }
    return this.sessionsService.update(
      sessionId,
      req.user.sub,
      updateSessionDto,
    );
  }
}
