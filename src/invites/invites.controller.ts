import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { Permission } from 'src/enums/permission.enum';
import { RequirePermissions } from 'src/decorators/require-permissions.decorator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/decorators/public.decorator';
import { InviteDto } from './dto/invite.dto';
import { PublicInviteDto } from './dto/public-invite.dto';

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
  create(@Body() createInviteDto: CreateInviteDto): Promise<InviteDto> {
    const createdBy = ''; // TODO sub from token
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
