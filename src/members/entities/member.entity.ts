import { SessionRepository } from '@/sessions/repository/session.repository';
import { Member } from '../dto/member';
import { SessionEntity } from '@/sessions/entities/session.entity';

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

  async getSession(
    sessionId: string,
    sessionRepository: SessionRepository,
  ): Promise<SessionEntity | undefined> {
    return sessionRepository.find(sessionId, this.userId);
  }
}
