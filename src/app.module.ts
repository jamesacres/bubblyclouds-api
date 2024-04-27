import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PartiesModule } from './parties/parties.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { InvitesModule } from './invites/invites.module';
import { MembersModule } from './members/members.module';
import { SessionsModule } from './sessions/sessions.module';
import { DynamoDBModule } from './dynamodb/dynamodb.module';

@Module({
  imports: [
    JwtModule,
    PartiesModule,
    InvitesModule,
    MembersModule,
    SessionsModule,
    DynamoDBModule.forRoot({
      // For testing
      // docker run -p 8000:8000 -it --rm instructure/dynamo-local-admin
      // admin in browser, use endpoint http://localhost:8000/
      clientConfig: {
        region: 'eu-west-2',
        endpoint: process.env.API_DB_ENDPOINT,
      },
      tableName: process.env.API_TABLE || 'Api',
    }),
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
