import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { InvitesService } from '@/invites/invites.service';
import { MemberRepository } from './repository/member.repository';
import { InviteRepository } from '@/invites/repository/invite.repository';
import { PartyRepository } from '@/parties/repository/party.repository';
import { RevenuecatService } from '@/revenuecat/revenuecat.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [MembersController],
  providers: [
    MembersService,
    MemberRepository,
    InviteRepository,
    PartyRepository,
    InvitesService,
    RevenuecatService,
    ConfigService,
  ],
})
export class MembersModule {}
