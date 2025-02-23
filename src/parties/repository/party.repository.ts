import { Injectable } from '@nestjs/common';
import { DynamoDBAdapter } from '@/dynamodb/dynamodb-adapter';
import { Party } from '../dto/party';
import { DynamoDBAdapterFactory } from '@/dynamodb/dynamodb-adapter.factory';
import { PartyEntity } from '../entities/party.entity';
import { Model } from '@/types/enums/model';
import { App } from '@/types/enums/app.enum';

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
    const partyId = `${payload.appId}-${nanoid()}`;
    return new PartyEntity(
      await this.adapter.upsert(
        partyId,
        { ...payload, partyId },
        { id: payload.createdBy, type: Model.USER },
      ),
    );
  }

  async find(
    partyId: string,
    createdBy?: string,
  ): Promise<PartyEntity | undefined> {
    let result;
    if (createdBy) {
      result = await this.adapter.findByIdAndOwner(partyId, {
        id: createdBy,
        type: Model.USER,
      });
    } else {
      const results = await this.adapter.findAllByModelId(partyId);
      if (results.length === 1) {
        result = results[0];
      }
    }
    if (result) {
      return new PartyEntity(result);
    }
  }

  async findAllOwnedByUser(
    createdBy: string,
    app?: App,
  ): Promise<PartyEntity[]> {
    const results = await this.adapter.findAllByOwner(
      {
        id: createdBy,
        type: Model.USER,
      },
      { type: Model.PARTY, idPrefix: app },
    );
    return (
      results
        .map((result) => new PartyEntity(result))
        // Newest parties first for user
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    );
  }

  async batchDestroy(items: PartyEntity[]) {
    return this.adapter.batchDestroy(
      items.map(({ partyId, createdBy }) => {
        return { id: partyId, owner: { id: createdBy, type: Model.USER } };
      }),
    );
  }
}
