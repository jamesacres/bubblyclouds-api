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
    const [ownerType, ownerId] = payload.resourceId.split('-');
    if (!Object.values(Model).includes(ownerType as Model)) {
      throw Error('Unsupported resourceId');
    }
    return this.adapter.upsert(
      inviteId,
      { ...payload, inviteId },
      { id: ownerId, type: ownerType as Model },
      payload.expiresAt,
    );
  }

  async find(inviteId: string): Promise<InviteEntity | undefined> {
    const payload = await this.adapter.findAllByModelId(inviteId);
    if (payload.length === 1) {
      return new InviteEntity(payload[0]);
    }
  }
}
