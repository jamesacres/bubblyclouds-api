import { Injectable } from '@nestjs/common';
import { CreatePartyDto } from './dto/create-party.dto';
import { PartyDto } from './dto/party.dto';
import { App } from '@/types/enums/app.enum';
import { PartyRepository } from './repository/party.repository';
import { MemberRepository } from '@/members/repository/member.repository';
import { Model } from '@/types/enums/model';
import { PartyEntity } from './entities/party.entity';

@Injectable()
export class PartiesService {
  constructor(
    private readonly partyRepository: PartyRepository,
    private readonly memberRepository: MemberRepository,
  ) {}

  async create(
    { appId, partyName, memberNickname }: CreatePartyDto,
    createdBy: string,
  ): Promise<PartyDto> {
    const party = await this.partyRepository.insert({
      appId,
      partyName,
      createdBy,
    });

    // Creator automatically becomes a member
    await this.memberRepository.insert({
      memberNickname,
      resourceId: `${Model.PARTY}-${party.partyId}`,
      userId: createdBy,
    });

    return party;
  }

  async findAllForUser(userId: string, app: App): Promise<PartyEntity[]> {
    const members = await this.memberRepository.findAllForUser(
      userId,
      Model.PARTY,
      app,
    );
    const partyIds = members.map((member) =>
      member.resourceId.replace(`${Model.PARTY}-`, ''),
    );

    const parties: PartyEntity[] = [];
    for (const partyId of partyIds) {
      const party = await this.partyRepository.find(partyId);
      if (party) {
        parties.push(party);
      }
    }

    return parties;
  }
}
