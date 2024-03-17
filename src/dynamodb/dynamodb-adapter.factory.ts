import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBAdapter } from './dynamodb-adapter';
import { BaseModel } from '@/types/interfaces/baseModel';

export class DynamoDBAdapterFactory {
  constructor(
    private readonly dynamoDBDocumentClient: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  public createAdapter = <T extends BaseModel>(modelName: string) =>
    new DynamoDBAdapter<T>(
      this.dynamoDBDocumentClient,
      this.tableName,
      modelName,
    );
}
