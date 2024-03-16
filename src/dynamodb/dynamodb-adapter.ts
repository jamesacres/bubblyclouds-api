/**
 * DynamoDB Table with following details:
 *        Partition Key: modelId
 *        Sort Key: owner
 *        TTL Attribute: expiresAt
 *        One Global Secondary Index:
 *            GSI 1:
 *                Index Name: ownerIndex
 *                Partition Key: owner
 *                Sort Key: modelId
 */
import {
  DeleteCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { backOff } from 'exponential-backoff';
import { BaseModel } from '../types/baseModel';
import { Owner } from '../types/owner';
import { Model } from '../types/model';

const MAX_RETRIES = 5;

interface Result<T extends BaseModel> {
  payload: Omit<T, 'expiresAt' | 'createdAt' | 'updatedAt'>;
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

const resultToRecord = <T extends BaseModel>(result: Result<T>): T => {
  return {
    ...result.payload,
    expiresAt: result.expiresAt ? new Date(result.expiresAt * 1000) : undefined,
    createdAt: new Date(result.createdAt * 1000),
    updatedAt: new Date(result.updatedAt * 1000),
  } as T;
};

export class DynamoDBAdapter<T extends BaseModel> {
  constructor(
    private dynamoDBDocumentClient: DynamoDBDocumentClient,
    private tableName: string,
    private modelName: string,
  ) {}

  async upsert(
    id: string,
    payload: Omit<T, 'expiresAt' | 'createdAt' | 'updatedAt'>,
    owner: Owner,
    expiresAt?: Date,
  ): Promise<T & { expiresAt?: Date; createdAt: Date; updatedAt: Date }> {
    const params: UpdateCommandInput = {
      TableName: this.tableName,
      Key: {
        modelId: this.modelName + '-' + id,
        owner: `${owner.type}-${owner.id}`,
      },
      UpdateExpression:
        'SET payload = :payload' +
        ', createdAt = if_not_exists(createdAt, :now), updatedAt = :now' +
        (owner ? ', owner = :owner' : '') +
        (expiresAt ? ', expiresAt = :expiresAt' : ''),
      ExpressionAttributeValues: {
        ':now': Math.floor(new Date().getTime() / 1000),
        ':payload': {
          ...payload,
          createdAt: undefined,
          updatedAt: undefined,
          expiresAt: undefined,
        },
        ...(owner ? { ':owner': `${owner.type}-${owner.id}` } : {}),
        ...(expiresAt
          ? { ':expiresAt': Math.floor(expiresAt.getTime() / 1000) }
          : {}),
      },
      ReturnValues: 'ALL_NEW',
    };
    const command = new UpdateCommand(params);

    const result = await this.dynamoDBDocumentClient.send(command);

    const resultAttributes = result.Attributes as Result<T>;

    return resultToRecord(resultAttributes);
  }

  async findByIdAndOwner(
    id: string,
    owner: Owner,
  ): Promise<
    (T & { expiresAt?: Date; createdAt: Date; updatedAt: Date }) | undefined
  > {
    const params: GetCommandInput = {
      TableName: this.tableName,
      Key: {
        modelId: this.modelName + '-' + id,
        owner: `${owner.type}-${owner.id}`,
      },
      ProjectionExpression: 'payload, expiresAt, createdAt, updatedAt',
    };
    const command = new GetCommand(params);

    const getResult = async () => {
      const commandResult = await this.dynamoDBDocumentClient.send(command);
      const result = commandResult?.Item as Result<T> | undefined;
      if (!result) {
        throw Error('not found');
      }
      return result;
    };

    const result = await backOff(getResult, {
      jitter: 'full',
      numOfAttempts: MAX_RETRIES,
    }).catch((e) => {
      console.warn(e);
      return undefined;
    });

    // DynamoDB can take upto 48 hours to drop expired items, so a check is required
    if (!result || (result.expiresAt && Date.now() > result.expiresAt * 1000)) {
      return undefined;
    }

    return resultToRecord(result);
  }

  async findAllByModelId(
    id: string,
  ): Promise<(T & { expiresAt?: Date; createdAt: Date; updatedAt: Date })[]> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: `modelId = :modelId`,
      ExpressionAttributeValues: {
        ':modelId': id,
      },
      ProjectionExpression: 'payload, expiresAt, createdAt, updatedAt',
    };
    const command = new QueryCommand(params);

    const getResults = async () => {
      const commandResult = await this.dynamoDBDocumentClient.send(command);
      const result = commandResult?.Items;
      if (!result?.length) {
        throw Error('not found');
      }
      return result;
    };

    const results = (await backOff(getResults, {
      jitter: 'full',
      numOfAttempts: MAX_RETRIES,
    }).catch((e) => {
      console.warn(e);
      return [];
    })) as Result<T>[];

    // DynamoDB can take upto 48 hours to drop expired items, so a check is required
    results.filter((result) => {
      const isExpired =
        !result || (result.expiresAt && Date.now() > result.expiresAt * 1000);
      return !isExpired;
    });

    return results.map((result) => resultToRecord(result));
  }

  async findAllByOwner(
    owner: Owner,
    type?: Model,
  ): Promise<(T & { expiresAt?: Date; createdAt: Date; updatedAt: Date })[]> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      IndexName: 'ownerIndex',
      KeyConditionExpression: `owner = :owner${type ? ` and begins_with(modelId, :type)` : ''}`,
      ExpressionAttributeValues: {
        ':owner': `${owner.type}-${owner.id}`,
        ...(type ? { ':type': type } : {}),
      },
      ProjectionExpression: 'payload, expiresAt, createdAt, updatedAt',
    };
    const command = new QueryCommand(params);

    const getResults = async () => {
      const commandResult = await this.dynamoDBDocumentClient.send(command);
      const result = commandResult?.Items;
      if (!result?.length) {
        throw Error('not found');
      }
      return result;
    };

    const results = (await backOff(getResults, {
      jitter: 'full',
      numOfAttempts: MAX_RETRIES,
    }).catch((e) => {
      console.warn(e);
      return [];
    })) as Result<T>[];

    // DynamoDB can take upto 48 hours to drop expired items, so a check is required
    results.filter((result) => {
      const isExpired =
        !result || (result.expiresAt && Date.now() > result.expiresAt * 1000);
      return !isExpired;
    });

    return results.map((result) => resultToRecord(result));
  }

  async destroy(id: string, owner: Owner): Promise<void> {
    const params: DeleteCommandInput = {
      TableName: this.tableName,
      Key: {
        modelId: this.modelName + '-' + id,
        owner: `${owner.type}-${owner.id}`,
      },
    };
    const command = new DeleteCommand(params);

    await this.dynamoDBDocumentClient.send(command);
  }
}
