import { PickType } from '@nestjs/swagger';
import { InviteDto } from './invite.dto';

export class PublicInviteDto extends PickType(InviteDto, [
  'description',
  'resourceId',
  'sessionId',
  'redirectUri',
]) {}
