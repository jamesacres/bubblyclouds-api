import { Member } from '../dto/member';

export class MemberEntity implements Member {
  userId: string;
  resourceId: string;
  memberNickname: string;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    userId,
    resourceId,
    memberNickname,
    createdAt,
    updatedAt,
  }: Member) {
    this.userId = userId;
    this.resourceId = resourceId;
    this.memberNickname = memberNickname;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
