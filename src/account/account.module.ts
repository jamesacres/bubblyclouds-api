import { Module } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';
import { SessionRepository } from '@/sessions/repository/session.repository';
import { MemberRepository } from '@/members/repository/member.repository';
import { PartyRepository } from '@/parties/repository/party.repository';
import { InviteRepository } from '@/invites/repository/invite.repository';

@Module({
  controllers: [AccountController],
  providers: [
    AccountService,
    SessionRepository,
    MemberRepository,
    PartyRepository,
    InviteRepository,
  ],
})
export class AccountModule {}
