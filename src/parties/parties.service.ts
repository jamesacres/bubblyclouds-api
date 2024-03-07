import { Injectable } from '@nestjs/common';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';
import { PartyDto } from './dto/party.dto';

@Injectable()
export class PartiesService {
  create(createPartyDto: CreatePartyDto): Promise<PartyDto> {
    return 'This action adds a new party' as any;
  }

  findAll(): Promise<PartyDto[]> {
    return `This action returns all parties` as any;
  }

  findOne(partyId: string): Promise<PartyDto> {
    return `This action returns a ${partyId} party` as any;
  }

  update(partyId: string, updatePartyDto: UpdatePartyDto): Promise<PartyDto> {
    return `This action updates a ${partyId} party` as any;
  }

  remove(partyId: string): Promise<void> {
    return `This action removes a ${partyId} party` as any;
  }
}
