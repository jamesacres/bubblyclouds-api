import { DynamoDBAdapter } from '@/dynamodb/dynamodb-adapter';
import { DynamoDBAdapterFactory } from '@/dynamodb/dynamodb-adapter.factory';
import { Model } from '@/types/enums/model';
import { Injectable } from '@nestjs/common';
import { UnblockRace } from '../dto/unblock-race';
import { UnblockRaceEntity } from '../entities/unblock-race.entity';

@Injectable()
export class UnblockRaceRepository {
  private adapter: DynamoDBAdapter<UnblockRace>;

  constructor(dynamoDBAdapterFactory: DynamoDBAdapterFactory) {
    this.adapter = dynamoDBAdapterFactory.createAdapter(Model.UNBLOCK_RACE);
  }

  /**
   * All five difficulties share one record, so unlike sudoku the id carries no
   * difficulty suffix.
   */
  private unblockRaceOfTheDayId(isTomorrow: boolean | undefined) {
    const now = new Date();
    if (isTomorrow) {
      now.setDate(now.getDate() + 1);
    }
    const date = now.toISOString().slice(0, 10).replaceAll('-', '');
    return `oftheday-${date}`;
  }

  async insertUnblockRaceOfTheDay(
    payload: Omit<
      UnblockRace,
      'unblockRaceId' | 'createdAt' | 'updatedAt' | 'expiresAt'
    >,
    isTomorrow: boolean | undefined,
  ): Promise<UnblockRaceEntity> {
    const unblockRaceId = this.unblockRaceOfTheDayId(isTomorrow);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isTomorrow ? 2 : 1));
    return new UnblockRaceEntity(
      await this.adapter.upsert(
        unblockRaceId,
        { ...payload, unblockRaceId },
        { id: 'oftheday', type: Model.UNBLOCK_RACE },
        expiresAt,
      ),
    );
  }

  async findUnblockRaceOfTheDay(
    isTomorrow: boolean | undefined,
  ): Promise<UnblockRaceEntity | undefined> {
    const unblockRaceId = this.unblockRaceOfTheDayId(isTomorrow);
    return this.adapter.findByIdAndOwner(unblockRaceId, {
      id: 'oftheday',
      type: Model.UNBLOCK_RACE,
    });
  }
}
