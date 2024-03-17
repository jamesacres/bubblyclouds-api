import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { Permission } from '@/types/enums/permission.enum';
import { RequirePermissions } from '@/decorators/require-permissions.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/decorators/public.decorator';
import { InviteDto } from './dto/invite.dto';
import { PublicInviteDto } from './dto/public-invite.dto';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';

@RequirePermissions(Permission.INVITES_WRITE)
@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @ApiBearerAuth('access-token')
  @ApiCreatedResponse({
    description: 'New invite to the resource (e.g. a party).',
    type: InviteDto,
  })
  @Post()
  create(
    @Request() req: RequestWithUser,
    @Body() createInviteDto: CreateInviteDto,
  ): Promise<InviteDto> {
    const createdBy = req.user.sub;
    return this.invitesService.create(createInviteDto, createdBy);
  }

  @Public()
  @ApiOkResponse({
    description:
      'Public Invite details, including who invited them to the resource, and optionally a session to redirect to.',
    type: PublicInviteDto,
  })
  @Get(':inviteId')
  findOne(@Param('inviteId') inviteId: string): Promise<PublicInviteDto> {
    return this.invitesService.findPublicInvite(inviteId);
  }
}
