import { Injectable } from '@nestjs/common';
import { CreatePartyDto } from './dto/create-party.dto';
import { PartyDto } from './dto/party.dto';
import { App } from '@/types/enums/app.enum';
import { PartyRepository } from './repository/party.repository';

@Injectable()
export class PartiesService {
  constructor(private readonly partyRepository: PartyRepository) {}

  async create(
    { appId, partyName }: CreatePartyDto,
    createdBy: string,
  ): Promise<PartyDto> {
    const party = await this.partyRepository.insert({
      appId,
      partyName,
      createdBy,
    });

    // TODO Automatically join the new party

    return party;
  }

  findAll(app: App): Promise<PartyDto[]> {
    // Lookup parties the user is a member of: modelId=member-user-{userId} where uid begins with party-{app}-
    return `This action returns all parties` as any;
  }
}
