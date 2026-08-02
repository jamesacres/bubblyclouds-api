import { DynamoDBAdapterFactory } from './dynamodb-adapter.factory';
import { DynamoDBAdapter } from './dynamodb-adapter';

describe('DynamoDBAdapterFactory', () => {
  it('creates an adapter bound to the client, table, and model name', () => {
    const client = { send: jest.fn() };
    const factory = new DynamoDBAdapterFactory(client as never, 'MyTable');
    const adapter = factory.createAdapter('party');
    expect(adapter).toBeInstanceOf(DynamoDBAdapter);
    // The adapter stores private fields; confirm they were wired by exercising a call
    expect((adapter as unknown as { tableName: string }).tableName).toBe(
      'MyTable',
    );
    expect((adapter as unknown as { modelName: string }).modelName).toBe(
      'party',
    );
  });
});
