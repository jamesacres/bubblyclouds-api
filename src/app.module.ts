import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PartiesModule } from './parties/parties.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { InvitesModule } from './invites/invites.module';
import { MembersModule } from './members/members.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    JwtModule,
    PartiesModule,
    InvitesModule,
    MembersModule,
    SessionsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
