import { Injectable } from '@nestjs/common';
import { CreatePartyDto } from './dto/create-party.dto';
import { UpdatePartyDto } from './dto/update-party.dto';

@Injectable()
export class PartiesService {
  create(createPartyDto: CreatePartyDto) {
    return 'This action adds a new party';
  }

  findAll() {
    return `This action returns all parties`;
  }

  findOne(partyId: string) {
    return `This action returns a ${partyId} party`;
  }

  update(partyId: string, updatePartyDto: UpdatePartyDto) {
    return `This action updates a ${partyId} party`;
  }

  remove(partyId: string) {
    return `This action removes a ${partyId} party`;
  }
}
