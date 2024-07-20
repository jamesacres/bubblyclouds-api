import { Injectable } from '@nestjs/common';
import { DynamoDBAdapter } from '@/dynamodb/dynamodb-adapter';
import { Member } from '../dto/member';
import { DynamoDBAdapterFactory } from '@/dynamodb/dynamodb-adapter.factory';
import { MemberEntity } from '../entities/member.entity';
import { Model } from '@/types/enums/model';
import { splitModelId } from '@/utils/splitModelId';

@Injectable()
export class MemberRepository {
  private adapter: DynamoDBAdapter<Member>;

  constructor(dynamoDBAdapterFactory: DynamoDBAdapterFactory) {
    this.adapter = dynamoDBAdapterFactory.createAdapter(Model.MEMBER);
  }

  async insert(
    payload: Omit<Member, 'createdAt' | 'updatedAt'>,
  ): Promise<MemberEntity> {
    const [ownerType, ownerId] = splitModelId(payload.resourceId);
    const memberId = `${Model.USER}-${payload.userId}`;
    return new MemberEntity(
      await this.adapter.upsert(memberId, payload, {
        id: ownerId,
        type: ownerType as Model,
      }),
    );
  }

  async findAllMembersForResource(resourceId: string): Promise<MemberEntity[]> {
    const [ownerType, ownerId] = splitModelId(resourceId);
    const results = await this.adapter.findAllByOwner(
      {
        id: ownerId,
        type: ownerType as Model,
      },
      { type: Model.MEMBER },
    );
    return results.map((result) => new MemberEntity(result));
  }

  async findAllForUser(
    userId: string,
    resourceType: Model,
    resourceIdPrefix: string,
  ): Promise<MemberEntity[]> {
    const memberId = `${Model.USER}-${userId}`;
    const results = await this.adapter.findAllByModelId(memberId, {
      type: resourceType,
      idPrefix: resourceIdPrefix,
    });
    return results.map((result) => new MemberEntity(result));
  }
}
