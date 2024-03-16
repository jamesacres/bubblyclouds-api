import { Controller, Get, Body, Patch, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { UpdateSessionDto } from './dto/update-session.dto';
import { RequirePermissions } from 'src/decorators/require-permissions.decorator';
import { Permission } from 'src/enums/permission.enum';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SessionDto } from './dto/session.dto';
import { SessionWithPartiesDto } from './dto/session-with-parties.dto';

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
    @Param('sessionId') sessionId: string,
  ): Promise<SessionWithPartiesDto> {
    return this.sessionsService.findOne(sessionId);
  }

  @ApiOkResponse({
    description: 'Updated session.',
    type: SessionDto,
  })
  @Patch(':sessionId')
  update(
    @Param('sessionId') sessionId: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ): Promise<SessionDto> {
    return this.sessionsService.update(sessionId, updateSessionDto);
  }
}
