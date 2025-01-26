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

@RequirePermissions(Permission.SESSIONS_WRITE)
@ApiTags('sessions')
@ApiBearerAuth('access-token')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @ApiOkResponse({
    description: 'Sessions the user has created.',
    type: [SessionDto],
  })
  @ApiQuery({ name: 'app', enum: App, required: true })
  @Get()
  async findAll(
    @Request() req: RequestWithUser,
    @Query('app') app: App,
  ): Promise<any[]> {
    if (!validateApp(app)) {
      throw new BadRequestException('Invalid app');
    }
    return this.sessionsService.findAllForUser(req.user.sub, app);
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
