import { OmitType } from '@nestjs/swagger';
import { PartyDto } from './party.dto';

export class CreatePartyDto extends OmitType(PartyDto, [
  'partyId',
  'userId',
  'createdAt',
]) {}
