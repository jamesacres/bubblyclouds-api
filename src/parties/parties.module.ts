import { Module } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';
import { PartyRepository } from './repository/party.repository';

@Module({
  controllers: [PartiesController],
  providers: [PartyRepository, PartiesService],
})
export class PartiesModule {}
