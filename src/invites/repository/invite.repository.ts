import { Injectable } from '@nestjs/common';
import { DynamoDBAdapter } from '../../dynamodb/dynamodb-adapter';
import { Invite } from '../dto/invite';
import { DynamoDBAdapterFactory } from '../../dynamodb/dynamodb-adapter.factory';
import { Model } from '../../types/model';
import { InviteEntity } from '../entities/invite.entity';

@Injectable()
export class InviteRepository {
  private adapter: DynamoDBAdapter<Invite>;

  constructor(dynamoDBAdapterFactory: DynamoDBAdapterFactory) {
    this.adapter = dynamoDBAdapterFactory.createAdapter(Model.INVITE);
  }

  async insert(
    payload: Omit<Invite, 'inviteId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Invite> {
    const { nanoid } = await import('nanoid');
    const inviteId = nanoid();
    return this.adapter.upsert(
      inviteId,
      { ...payload, inviteId },
      payload.resourceId,
      payload.expiresAt,
    );
  }

  async find(id: string): Promise<InviteEntity | undefined> {
    const payload = await this.adapter.find(id);
    if (payload) {
      return new InviteEntity(payload);
    }
  }
}
