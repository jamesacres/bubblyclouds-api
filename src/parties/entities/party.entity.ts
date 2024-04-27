import { MemberRepository } from '@/members/repository/member.repository';
import { Party } from '../dto/party';
import { Model } from '@/types/enums/model';
import { MemberEntity } from '@/members/entities/member.entity';

export class PartyEntity implements Party {
  partyId: string;
  appId: string;
  partyName: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    partyId,
    appId,
    partyName,
    createdBy,
    createdAt,
    updatedAt,
  }: Party) {
    this.partyId = partyId;
    this.appId = appId;
    this.partyName = partyName;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  public async findMembers(
    memberRepository: MemberRepository,
  ): Promise<MemberEntity[]> {
    return memberRepository.findAllMembersForResource(
      `${Model.PARTY}-${this.partyId}`,
    );
  }
}
