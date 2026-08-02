import {
  AttributeValue,
  BatchWriteItemCommand,
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceNotFoundException,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import {
  AWS_REGION,
  DYNAMODB_ENDPOINT,
  TEST_AWS_CREDENTIALS,
  TEST_TABLE_NAME,
} from './config';

let dynamodbClient: DynamoDBClient;

export const getDynamoDBClient = (): DynamoDBClient => {
  if (!dynamodbClient) {
    dynamodbClient = new DynamoDBClient({
      endpoint: DYNAMODB_ENDPOINT,
      region: AWS_REGION,
      credentials: TEST_AWS_CREDENTIALS,
    });
  }
  return dynamodbClient;
};

export const tableExists = async (): Promise<boolean> => {
  const client = getDynamoDBClient();
  try {
    await client.send(new DescribeTableCommand({ TableName: TEST_TABLE_NAME }));
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      return false;
    }
    throw err;
  }
};

/**
 * Creates the API table, matching the schema described in
 * src/dynamodb/dynamodb-adapter.ts:
 *   - Partition key: modelId (S)
 *   - Sort key: owner (S)
 *   - GSI ownerIndex: owner (HASH) + modelId (RANGE)
 */
export const createTable = async (): Promise<void> => {
  const client = getDynamoDBClient();
  await client.send(
    new CreateTableCommand({
      TableName: TEST_TABLE_NAME,
      AttributeDefinitions: [
        { AttributeName: 'modelId', AttributeType: 'S' },
        { AttributeName: 'owner', AttributeType: 'S' },
      ],
      KeySchema: [
        { AttributeName: 'modelId', KeyType: 'HASH' },
        { AttributeName: 'owner', KeyType: 'RANGE' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'ownerIndex',
          KeySchema: [
            { AttributeName: 'owner', KeyType: 'HASH' },
            { AttributeName: 'modelId', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    }),
  );
};

export const deleteTable = async (): Promise<void> => {
  const client = getDynamoDBClient();
  try {
    await client.send(new DeleteTableCommand({ TableName: TEST_TABLE_NAME }));
  } catch (err) {
    if (!(err instanceof ResourceNotFoundException)) {
      throw err;
    }
  }
};

export const clearTable = async (): Promise<void> => {
  const client = getDynamoDBClient();

  let lastEvaluatedKey: Record<string, AttributeValue> | undefined;
  do {
    const scanResult = await client.send(
      new ScanCommand({
        TableName: TEST_TABLE_NAME,
        ProjectionExpression: 'modelId, #o',
        ExpressionAttributeNames: { '#o': 'owner' },
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    lastEvaluatedKey = scanResult.LastEvaluatedKey as
      Record<string, AttributeValue> | undefined;
    const items = scanResult.Items || [];
    if (items.length === 0) {
      break;
    }

    for (let i = 0; i < items.length; i += 25) {
      const chunk = items.slice(i, i + 25);
      await client.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [TEST_TABLE_NAME]: chunk.map((item) => ({
              DeleteRequest: {
                Key: { modelId: item.modelId, owner: item.owner },
              },
            })),
          },
        }),
      );
    }
  } while (lastEvaluatedKey);
};

export const setupDynamoDB = async (): Promise<void> => {
  if (!(await tableExists())) {
    await createTable();
  } else {
    await clearTable();
  }
};

export const teardownDynamoDB = async (): Promise<void> => {
  await deleteTable();
};
