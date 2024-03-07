import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PartiesModule } from './parties/parties.module';

@Module({
  imports: [PartiesModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
