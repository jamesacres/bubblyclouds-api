import { IntersectionType, OmitType } from '@nestjs/swagger';
import { PartyDto } from './party.dto';
import { CreateMemberDto } from '@/members/dto/create-member.dto';

export class CreatePartyDto extends IntersectionType(
  OmitType(PartyDto, ['partyId', 'createdBy', 'createdAt', 'updatedAt']),
  OmitType(CreateMemberDto, ['inviteId']),
) {}
