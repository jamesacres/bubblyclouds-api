import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  PartyMemberSession,
  SessionWithPartiesDto,
} from './dto/session-with-parties.dto';
import { SessionRepository } from './repository/session.repository';
import { splitSessionId } from '@/utils/splitSessionId';
import { PartiesService } from '@/parties/parties.service';
import { MemberRepository } from '@/members/repository/member.repository';
import { SessionEntity } from './entities/session.entity';
import { App } from '@/types/enums/app.enum';

@Injectable()
export class SessionsService {
  constructor(
    private sessionRepository: SessionRepository,
    private partiesService: PartiesService,
    private memberRepository: MemberRepository,
  ) {}

  async findPartyMemberSessions(
    sessionId: string,
    userId: string,
  ): Promise<Record<string, PartyMemberSession>> {
    const result: SessionWithPartiesDto['parties'] = {};
    const { app } = splitSessionId(sessionId);
    const parties = await this.partiesService.findAllForUser(userId, app);
    for (const party of parties) {
      result[party.partyId] = { memberSessions: {} };
      const members = await party.findMembers(this.memberRepository);
      for (const member of members.filter(
        (member) => member.userId !== userId,
      )) {
        const memberSession = await member.getSession(
          sessionId,
          this.sessionRepository,
        );
        if (memberSession) {
          result[party.partyId].memberSessions[memberSession.userId] =
            memberSession;
        }
      }
    }
    return result;
  }

  async findOne(
    sessionId: string,
    userId: string,
  ): Promise<SessionWithPartiesDto> {
    const session = await this.sessionRepository.find(sessionId, userId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    const result: SessionWithPartiesDto = {
      ...session,
      parties: await this.findPartyMemberSessions(sessionId, userId),
    };
    return result;
  }

  async update(
    sessionId: string,
    userId: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<SessionWithPartiesDto> {
    const session = await this.sessionRepository.upsert(
      sessionId,
      userId,
      updateSessionDto,
    );
    const result: SessionWithPartiesDto = {
      ...session,
      parties: await this.findPartyMemberSessions(sessionId, userId),
    };
    return result;
  }

  async findAllForUser(userId: string, app: App): Promise<SessionEntity[]> {
    return this.sessionRepository.findAllForUser(userId, app);
  }
}
