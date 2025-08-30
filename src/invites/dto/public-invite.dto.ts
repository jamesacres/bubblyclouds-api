import { ApiProperty, PickType } from '@nestjs/swagger';
import { InviteDto } from './invite.dto';
import { IsOptional, IsString } from 'class-validator';
import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';

export class PublicInviteDto extends PickType(InviteDto, [
  'description',
  'resourceId',
  'sessionId',
  'redirectUri',
]) {
  @ApiProperty()
  @IsString()
  @IsOptional()
  entitlementDuration?: EntitlementDuration;
}
