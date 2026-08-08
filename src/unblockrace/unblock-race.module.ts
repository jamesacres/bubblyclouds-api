import { Module } from '@nestjs/common';
import { UnblockRaceCollectionRepository } from './repository/unblock-race-collection.repository';
import { UnblockRaceRepository } from './repository/unblock-race.repository';
import { UnblockRaceController } from './unblock-race.controller';
import { UnblockRaceService } from './unblock-race.service';

@Module({
  controllers: [UnblockRaceController],
  providers: [
    UnblockRaceRepository,
    UnblockRaceCollectionRepository,
    UnblockRaceService,
  ],
})
export class UnblockRaceModule {}
