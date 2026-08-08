import { DynamoDBAdapter } from '@/dynamodb/dynamodb-adapter';
import { DynamoDBAdapterFactory } from '@/dynamodb/dynamodb-adapter.factory';
import { Model } from '@/types/enums/model';
import { Injectable } from '@nestjs/common';
import { UnblockRaceCollection } from '../dto/unblock-race-collection';
import { UnblockRaceCollectionEntity } from '../entities/unblock-race-collection.entity';

@Injectable()
export class UnblockRaceCollectionRepository {
  private adapter: DynamoDBAdapter<UnblockRaceCollection>;

  constructor(dynamoDBAdapterFactory: DynamoDBAdapterFactory) {
    this.adapter = dynamoDBAdapterFactory.createAdapter(
      Model.UNBLOCK_RACE_COLLECTION,
    );
  }

  private unblockRaceCollectionOfTheMonthId(isNextMonth: boolean | undefined) {
    const now = new Date();
    if (isNextMonth) {
      now.setMonth(now.getMonth() + 1);
    }
    const date = now.toISOString().slice(0, 7).replaceAll('-', '');
    return `ofthemonth-${date}`;
  }

  async insertUnblockRaceCollectionOfTheMonth(
    payload: Omit<
      UnblockRaceCollection,
      'unblockRaceCollectionId' | 'createdAt' | 'updatedAt' | 'expiresAt'
    >,
    isNextMonth: boolean | undefined,
  ): Promise<UnblockRaceCollectionEntity> {
    const unblockRaceCollectionId =
      this.unblockRaceCollectionOfTheMonthId(isNextMonth);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (isNextMonth ? 2 : 1));
    expiresAt.setDate(1);
    return new UnblockRaceCollectionEntity(
      await this.adapter.upsert(
        unblockRaceCollectionId,
        { ...payload, unblockRaceCollectionId },
        { id: 'ofthemonth', type: Model.UNBLOCK_RACE_COLLECTION },
        expiresAt,
      ),
    );
  }

  async findUnblockRaceCollectionOfTheMonth(
    isNextMonth: boolean | undefined,
  ): Promise<UnblockRaceCollectionEntity | undefined> {
    const unblockRaceCollectionId =
      this.unblockRaceCollectionOfTheMonthId(isNextMonth);
    return this.adapter.findByIdAndOwner(unblockRaceCollectionId, {
      id: 'ofthemonth',
      type: Model.UNBLOCK_RACE_COLLECTION,
    });
  }
}
