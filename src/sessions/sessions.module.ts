import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionRepository } from './repository/session.repository';
import { PartiesService } from '@/parties/parties.service';
import { MemberRepository } from '@/members/repository/member.repository';
import { PartyRepository } from '@/parties/repository/party.repository';

@Module({
  controllers: [SessionsController],
  providers: [
    SessionRepository,
    SessionsService,
    PartyRepository,
    PartiesService,
    MemberRepository,
  ],
})
export class SessionsModule {}
