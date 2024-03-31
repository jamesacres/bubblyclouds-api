import { Module } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';
import { PartyRepository } from './repository/party.repository';
import { MemberRepository } from '@/members/repository/member.repository';

@Module({
  controllers: [PartiesController],
  providers: [PartyRepository, MemberRepository, PartiesService],
})
export class PartiesModule {}
