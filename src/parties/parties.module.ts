import { Module } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';
import { PartyRepository } from './repository/party.repository';
import { MemberRepository } from '@/members/repository/member.repository';
import { RevenuecatService } from '@/revenuecat/revenuecat.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [PartiesController],
  providers: [
    PartyRepository,
    MemberRepository,
    PartiesService,
    RevenuecatService,
    ConfigService,
  ],
})
export class PartiesModule {}
