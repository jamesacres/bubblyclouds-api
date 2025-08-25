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
  QueryCommandOutput,
  UpdateCommand,
  UpdateCommandInput,
  BatchWriteCommand,
  BatchWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { backOff } from 'exponential-backoff';
import { BaseModel } from '@/types/interfaces/baseModel';
import { Owner } from '@/types/interfaces/owner';
import { Model } from '@/types/enums/model';

const MAX_RETRIES = 5;
const MAX_PAGES = 10;

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
    console.info('upsert', this.modelName, id, owner, expiresAt);
    const params: UpdateCommandInput = {
      TableName: this.tableName,
      Key: {
        modelId: this.modelName + '-' + id,
        owner: `${owner.type}-${owner.id}`,
      },
      UpdateExpression:
        'SET payload = :payload' +
        ', createdAt = if_not_exists(createdAt, :now), updatedAt = :now' +
        (expiresAt ? ', expiresAt = :expiresAt' : ''),
      ExpressionAttributeValues: {
        ':now': Math.floor(new Date().getTime() / 1000),
        ':payload': {
          ...payload,
          createdAt: undefined,
          updatedAt: undefined,
          expiresAt: undefined,
        },
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
    disableBackoff?: boolean,
  ): Promise<
    (T & { expiresAt?: Date; createdAt: Date; updatedAt: Date }) | undefined
  > {
    console.info('findByIdAndOwner', this.modelName, id, owner);
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
      console.info(`getResult owner:${owner.type}-${owner.id} id:${id}`);
      const commandResult = await this.dynamoDBDocumentClient.send(command);
      const result = commandResult?.Item as Result<T> | undefined;
      if (!result) {
        throw Error(`not found owner:${owner.type}-${owner.id} id:${id}`);
      }
      return result;
    };

    const result = await backOff(getResult, {
      jitter: 'full',
      numOfAttempts: disableBackoff ? 1 : MAX_RETRIES,
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
    owner?: { type: Model; idPrefix?: string },
    disableBackoff?: boolean,
  ): Promise<(T & { expiresAt?: Date; createdAt: Date; updatedAt: Date })[]> {
    console.info('findAllByModelId', this.modelName, id, owner);
    return this.getResults(
      {
        TableName: this.tableName,
        KeyConditionExpression: `modelId = :modelId${owner ? ` and begins_with(#owner, :ownerPrefix)` : ''}`,
        ...(owner ? { ExpressionAttributeNames: { '#owner': 'owner' } } : {}),
        ExpressionAttributeValues: {
          ':modelId': this.modelName + '-' + id,
          ...(owner
            ? {
                ':ownerPrefix': `${owner.type}-${owner.idPrefix !== undefined ? owner.idPrefix : ''}`,
              }
            : {}),
        },
        ProjectionExpression: 'payload, expiresAt, createdAt, updatedAt',
      },
      disableBackoff,
    );
  }

  async findAllByOwner(
    owner: Owner,
    type?: { type: Model; idPrefix?: string },
  ): Promise<(T & { expiresAt?: Date; createdAt: Date; updatedAt: Date })[]> {
    console.info('findAllByOwner', this.modelName, owner, type);
    return this.getResults({
      TableName: this.tableName,
      IndexName: 'ownerIndex',
      KeyConditionExpression: `#owner = :owner${type ? ` and begins_with(modelId, :typePrefix)` : ''}`,
      ExpressionAttributeNames: { '#owner': 'owner' },
      ExpressionAttributeValues: {
        ':owner': `${owner.type}-${owner.id}`,
        ...(type
          ? {
              ':typePrefix': `${type.type}-${type.idPrefix !== undefined ? type.idPrefix : ''}`,
            }
          : {}),
      },
      ProjectionExpression: 'payload, expiresAt, createdAt, updatedAt',
    });
  }

  async destroy(id: string, owner: Owner): Promise<void> {
    console.info('destroy', this.modelName, id, owner);
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

  private async doBatchWrite(params: BatchWriteCommandInput, attempt = 0) {
    console.info(
      `doBatchWrite attempt ${attempt} params`,
      JSON.stringify(params),
    );
    if (attempt > MAX_RETRIES) {
      throw Error(`doBatchWrite reached max retries ${MAX_RETRIES}`);
    }
    const command = new BatchWriteCommand(params);
    const result = await backOff(
      () => this.dynamoDBDocumentClient.send(command),
      {
        jitter: 'full',
        numOfAttempts: MAX_RETRIES,
      },
    ).catch((e) => {
      console.warn(e);
      // Treat all as unprocessed
      return { UnprocessedItems: params.RequestItems };
    });
    if (
      result.UnprocessedItems &&
      Object.keys(result.UnprocessedItems).length
    ) {
      // Try to delete any unprocessed again
      await this.doBatchWrite(
        { RequestItems: result.UnprocessedItems },
        attempt + 1,
      );
    }
  }

  async batchDestroy(items: { id: string; owner: Owner }[]): Promise<void> {
    console.info(
      'batchDestroy',
      this.modelName,
      items.map(
        (item) => `${item.id} owned by ${item.owner.type} ${item.owner.id}`,
      ),
    );
    // Batches of 25
    const batchSize = 25;
    const batches = [...Array(Math.ceil(items.length / batchSize))].map(
      (_, i) => items.slice(i * batchSize, (i + 1) * batchSize),
    );
    const errors: Error[] = [];
    for (const batch of batches) {
      try {
        const params: BatchWriteCommandInput = {
          RequestItems: {
            [this.tableName]: batch.map(({ id, owner }) => {
              return {
                DeleteRequest: {
                  Key: {
                    modelId: this.modelName + '-' + id,
                    owner: `${owner.type}-${owner.id}`,
                  },
                },
              };
            }),
          },
        };
        await this.doBatchWrite(params);
      } catch (e) {
        console.error(e);
        errors.push(e);
      }
    }
    if (errors.length) {
      throw Error(`batchDestroy had ${errors.length} failed batches`);
    }
  }

  private async getResults(
    params: QueryCommandInput,
    disableBackoff?: boolean,
  ) {
    const getPage = async (
      ExclusiveStartKey?: QueryCommandOutput['LastEvaluatedKey'],
    ) => {
      const command = new QueryCommand({
        ...params,
        ExclusiveStartKey,
      });

      const getResult = async () => {
        console.info(
          `getResult ExpressionAttributeValues:${JSON.stringify(params.ExpressionAttributeValues)}`,
        );
        const commandResult = await this.dynamoDBDocumentClient.send(command);
        const items = commandResult?.Items as Result<T>[];
        const LastEvaluatedKey = commandResult.LastEvaluatedKey;
        if (!items?.length) {
          throw Error(
            `not found ExpressionAttributeValues:${JSON.stringify(params.ExpressionAttributeValues)}`,
          );
        }
        return { items, LastEvaluatedKey };
      };

      return backOff(getResult, {
        jitter: 'full',
        numOfAttempts: disableBackoff ? 1 : MAX_RETRIES,
      }).catch((e) => {
        console.warn(e);
        return { items: [], LastEvaluatedKey: undefined };
      });
    };

    const results = [];
    let ExclusiveStartKey: QueryCommandOutput['LastEvaluatedKey'];
    let n = 1;
    while (n <= MAX_PAGES) {
      if (ExclusiveStartKey) {
        console.info('Fetching page', n);
      }
      const page = await getPage(ExclusiveStartKey);
      ExclusiveStartKey = page.LastEvaluatedKey;
      results.push(...page.items);
      if (!ExclusiveStartKey) {
        break;
      }
      n = n + 1;
    }

    // DynamoDB can take upto 48 hours to drop expired items, so a check is required
    return results
      .filter((result) => {
        const isExpired =
          !result || (result.expiresAt && Date.now() > result.expiresAt * 1000);
        return !isExpired;
      })
      .map((result) => resultToRecord(result));
  }
}
