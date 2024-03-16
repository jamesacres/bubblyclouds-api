import { Module } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { InviteRepository } from './repository/invite.repository';

@Module({
  controllers: [InvitesController],
  providers: [InviteRepository, InvitesService],
})
export class InvitesModule {}
