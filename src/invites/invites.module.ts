import { Module } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { InviteRepository } from './repository/invite.repository';
import { PartyRepository } from '@/parties/repository/party.repository';
import { MemberRepository } from '@/members/repository/member.repository';

@Module({
  controllers: [InvitesController],
  providers: [
    PartyRepository,
    InviteRepository,
    MemberRepository,
    InvitesService,
  ],
})
export class InvitesModule {}
