import { Injectable } from '@nestjs/common';
import { DynamoDBAdapter } from '@/dynamodb/dynamodb-adapter';
import { Session } from '../dto/session';
import { DynamoDBAdapterFactory } from '@/dynamodb/dynamodb-adapter.factory';
import { SessionEntity } from '../entities/session.entity';
import { Model } from '@/types/enums/model';
import { App } from '@/types/enums/app.enum';

@Injectable()
export class SessionRepository {
  private adapter: DynamoDBAdapter<Session>;

  constructor(dynamoDBAdapterFactory: DynamoDBAdapterFactory) {
    this.adapter = dynamoDBAdapterFactory.createAdapter(Model.SESSION);
  }

  async upsert(
    sessionId: string,
    userId: string,
    payload: Omit<Session, 'sessionId' | 'userId' | 'createdAt' | 'updatedAt'>,
  ): Promise<SessionEntity> {
    return new SessionEntity(
      await this.adapter.upsert(
        sessionId,
        { ...payload, sessionId, userId },
        { id: userId, type: Model.USER },
        payload.expiresAt,
      ),
    );
  }

  async find(
    sessionId: string,
    createdBy: string,
  ): Promise<SessionEntity | undefined> {
    const result = await this.adapter.findByIdAndOwner(sessionId, {
      id: createdBy,
      type: Model.USER,
    });
    if (result) {
      return new SessionEntity(result);
    }
  }

  async findAllForUser(createdBy: string, app: App): Promise<SessionEntity[]> {
    const results = await this.adapter.findAllByOwner(
      {
        id: createdBy,
        type: Model.USER,
      },
      { type: Model.SESSION, idPrefix: app },
    );
    return (
      results
        .map((result) => new SessionEntity(result))
        // Newest sessions first for user
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    );
  }
}
