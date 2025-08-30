import { Module } from '@nestjs/common';
import { RevenuecatService } from './revenuecat.service';
import { ConfigService } from '@nestjs/config';

@Module({
  providers: [RevenuecatService, ConfigService],
})
export class RevenuecatModule {}
