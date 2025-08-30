import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionRepository } from './repository/session.repository';
import { PartiesService } from '@/parties/parties.service';
import { MemberRepository } from '@/members/repository/member.repository';
import { PartyRepository } from '@/parties/repository/party.repository';
import { RevenuecatService } from '@/revenuecat/revenuecat.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [SessionsController],
  providers: [
    SessionRepository,
    SessionsService,
    PartyRepository,
    PartiesService,
    MemberRepository,
    RevenuecatService,
    ConfigService,
  ],
})
export class SessionsModule {}
