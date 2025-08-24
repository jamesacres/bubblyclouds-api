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
import { SessionDto } from './dto/session.dto';

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
    const { app } = splitSessionId(sessionId);
    const parties = await this.partiesService.findAllForUser(userId, app);
    const result: SessionWithPartiesDto['parties'] = (
      await Promise.all(
        parties.map(async (party) => {
          const thisResult: SessionWithPartiesDto['parties'] = {
            [party.partyId]: { memberSessions: {} },
          };
          const members = await party.findMembers(this.memberRepository);
          thisResult[party.partyId].memberSessions = (
            await Promise.all(
              members
                .filter((member) => member.userId !== userId)
                .map(async (member) => {
                  const thisMemberSessions: Record<string, SessionDto> = {};
                  const memberSession = await member.getSession(
                    sessionId,
                    this.sessionRepository,
                  );
                  if (memberSession) {
                    thisMemberSessions[memberSession.userId] = memberSession;
                  }
                  return thisMemberSessions;
                }),
            )
          ).reduce(
            (thisPartyMemberSessions, thisMemberSessions) => {
              const newResult: Record<string, SessionDto> = {
                ...thisPartyMemberSessions,
                ...thisMemberSessions,
              };
              return newResult;
            },
            {} as Record<string, SessionDto>,
          );
          return thisResult;
        }),
      )
    ).reduce(
      (result, thisResult) => {
        const newResult: SessionWithPartiesDto['parties'] = {
          ...result,
          ...thisResult,
        };
        return newResult;
      },
      {} as SessionWithPartiesDto['parties'],
    );
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
