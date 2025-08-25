import { MemberRepository } from '@/members/repository/member.repository';
import { Party } from '../dto/party';
import { Model } from '@/types/enums/model';
import { MemberEntity } from '@/members/entities/member.entity';

const DEFAULT_MAX_SIZE = 5;

export class PartyEntity implements Party {
  partyId: string;
  appId: string;
  partyName: string;
  createdBy: string;
  maxSize: number;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    partyId,
    appId,
    partyName,
    createdBy,
    maxSize,
    createdAt,
    updatedAt,
  }: Party) {
    this.partyId = partyId;
    this.appId = appId;
    this.partyName = partyName;
    this.createdBy = createdBy;
    this.maxSize = maxSize || DEFAULT_MAX_SIZE;
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
