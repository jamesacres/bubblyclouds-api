import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { UpdateSessionDto } from './dto/update-session.dto';
import { RequirePermissions } from '@/decorators/require-permissions.decorator';
import { Permission } from '@/types/enums/permission.enum';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionWithPartiesDto } from './dto/session-with-parties.dto';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';
import { splitSessionId } from '@/utils/splitSessionId';

@RequirePermissions(Permission.SESSIONS_WRITE)
@ApiTags('sessions')
@ApiBearerAuth('access-token')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

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
