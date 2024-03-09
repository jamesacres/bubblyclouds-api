import { OmitType } from '@nestjs/swagger';
import { InviteDto } from './invite.dto';

export class CreateInviteDto extends OmitType(InviteDto, [
  'inviteId',
  'createdBy',
  'createdAt',
  'updatedAt',
]) {}
