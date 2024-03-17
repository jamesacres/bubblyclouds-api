import { Module } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { InviteRepository } from './repository/invite.repository';
import { PartyRepository } from '@/parties/repository/party.repository';

@Module({
  controllers: [InvitesController],
  providers: [PartyRepository, InviteRepository, InvitesService],
})
export class InvitesModule {}
