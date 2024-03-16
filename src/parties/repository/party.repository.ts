import { Injectable } from '@nestjs/common';
import { DynamoDBAdapter } from '../../dynamodb/dynamodb-adapter';
import { Party } from '../dto/party';
import { DynamoDBAdapterFactory } from '../../dynamodb/dynamodb-adapter.factory';
import { PartyEntity } from '../entities/party.entity';
import { Model } from '../../types/model';

@Injectable()
export class PartyRepository {
  private adapter: DynamoDBAdapter<Party>;

  constructor(dynamoDBAdapterFactory: DynamoDBAdapterFactory) {
    this.adapter = dynamoDBAdapterFactory.createAdapter(Model.PARTY);
  }

  async insert(
    payload: Omit<Party, 'partyId' | 'createdAt' | 'updatedAt'>,
  ): Promise<PartyEntity> {
    const { nanoid } = await import('nanoid');
    const partyId = nanoid();
    return new PartyEntity(
      await this.adapter.upsert(
        partyId,
        { ...payload, partyId },
        payload.createdBy,
      ),
    );
  }

  async find(
    partyId: string,
    createdBy?: string,
  ): Promise<PartyEntity | undefined> {
    const payload = await this.adapter.find(
      partyId,
      createdBy ? `${Model.USER}-${createdBy}` : undefined,
    );
    if (payload) {
      return new PartyEntity(payload);
    }
  }
}
