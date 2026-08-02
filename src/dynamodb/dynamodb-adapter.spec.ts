import { DynamoDBAdapter } from './dynamodb-adapter';
import { Model } from '@/types/enums/model';

interface TestModel {
  id: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const nowSecs = () => Math.floor(Date.now() / 1000);

const makeResultAttributes = (
  payload: object,
  { expiresAt, createdAt = nowSecs(), updatedAt = nowSecs() } = {} as {
    expiresAt?: number;
    createdAt?: number;
    updatedAt?: number;
  },
) => ({ payload, expiresAt, createdAt, updatedAt });

describe('DynamoDBAdapter', () => {
  let send: jest.Mock;
  let client: { send: jest.Mock };
  let adapter: DynamoDBAdapter<TestModel>;

  beforeEach(() => {
    send = jest.fn();
    client = { send };
    adapter = new DynamoDBAdapter<TestModel>(
      client as never,
      'TestTable',
      'party',
    );
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('upsert', () => {
    it('sends an UpdateCommand and maps the returned attributes to a record', async () => {
      send.mockResolvedValue({
        Attributes: makeResultAttributes({ id: 'p1' }),
      });
      const result = await adapter.upsert('p1', { id: 'p1' } as never, {
        id: 'user1',
        type: Model.USER,
      });
      expect(send).toHaveBeenCalledTimes(1);
      const command = send.mock.calls[0][0];
      expect(command.input.TableName).toBe('TestTable');
      expect(command.input.Key).toEqual({
        modelId: 'party-p1',
        owner: 'user-user1',
      });
      expect(command.input.ReturnValues).toBe('ALL_NEW');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('includes expiresAt in the update expression when provided', async () => {
      const expiresAt = new Date(Date.now() + 100000);
      send.mockResolvedValue({
        Attributes: makeResultAttributes(
          { id: 'p1' },
          { expiresAt: Math.floor(expiresAt.getTime() / 1000) },
        ),
      });
      const result = await adapter.upsert(
        'p1',
        { id: 'p1' } as never,
        { id: 'user1', type: Model.USER },
        expiresAt,
      );
      const command = send.mock.calls[0][0];
      expect(command.input.UpdateExpression).toContain(
        'expiresAt = :expiresAt',
      );
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('findByIdAndOwner', () => {
    it('returns the record when found and not expired', async () => {
      send.mockResolvedValue({ Item: makeResultAttributes({ id: 'p1' }) });
      const result = await adapter.findByIdAndOwner('p1', {
        id: 'user1',
        type: Model.USER,
      });
      expect(result).toBeDefined();
      expect(result?.id).toBe('p1');
    });

    it('returns undefined when the item is not found (with backoff disabled)', async () => {
      send.mockResolvedValue({ Item: undefined });
      const result = await adapter.findByIdAndOwner(
        'p1',
        { id: 'user1', type: Model.USER },
        true,
      );
      expect(result).toBeUndefined();
    });

    it('returns undefined when the record has expired', async () => {
      send.mockResolvedValue({
        Item: makeResultAttributes(
          { id: 'p1' },
          { expiresAt: nowSecs() - 100 },
        ),
      });
      const result = await adapter.findByIdAndOwner(
        'p1',
        { id: 'user1', type: Model.USER },
        true,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('findAllByModelId', () => {
    it('queries by modelId and returns records', async () => {
      send.mockResolvedValue({
        Items: [makeResultAttributes({ id: 'p1' })],
        LastEvaluatedKey: undefined,
      });
      const results = await adapter.findAllByModelId('p1');
      expect(results).toHaveLength(1);
      const command = send.mock.calls[0][0];
      expect(command.input.KeyConditionExpression).toContain(
        'modelId = :modelId',
      );
    });

    it('adds an owner prefix condition when owner is provided', async () => {
      send.mockResolvedValue({
        Items: [makeResultAttributes({ id: 'p1' })],
        LastEvaluatedKey: undefined,
      });
      await adapter.findAllByModelId('p1', { type: Model.USER, idPrefix: 'u' });
      const command = send.mock.calls[0][0];
      expect(command.input.KeyConditionExpression).toContain('begins_with');
      expect(command.input.ExpressionAttributeValues[':ownerPrefix']).toBe(
        'user-u',
      );
    });

    it('returns an empty array when nothing is found', async () => {
      send.mockResolvedValue({ Items: [], LastEvaluatedKey: undefined });
      const results = await adapter.findAllByModelId('p1', undefined, true);
      expect(results).toEqual([]);
    });
  });

  describe('findAllByOwner', () => {
    it('queries the ownerIndex and filters expired records', async () => {
      send.mockResolvedValue({
        Items: [
          makeResultAttributes({ id: 'p1' }),
          makeResultAttributes({ id: 'p2' }, { expiresAt: nowSecs() - 1 }),
        ],
        LastEvaluatedKey: undefined,
      });
      const results = await adapter.findAllByOwner(
        { id: 'user1', type: Model.USER },
        { type: Model.PARTY },
      );
      expect(results).toHaveLength(1);
      const command = send.mock.calls[0][0];
      expect(command.input.IndexName).toBe('ownerIndex');
    });

    it('paginates across multiple pages', async () => {
      send
        .mockResolvedValueOnce({
          Items: [makeResultAttributes({ id: 'p1' })],
          LastEvaluatedKey: { modelId: 'party-p1' },
        })
        .mockResolvedValueOnce({
          Items: [makeResultAttributes({ id: 'p2' })],
          LastEvaluatedKey: undefined,
        });
      const results = await adapter.findAllByOwner({
        id: 'user1',
        type: Model.USER,
      });
      expect(results).toHaveLength(2);
      expect(send).toHaveBeenCalledTimes(2);
    });
  });

  describe('destroy', () => {
    it('sends a DeleteCommand with the right key', async () => {
      send.mockResolvedValue({});
      await adapter.destroy('p1', { id: 'user1', type: Model.USER });
      const command = send.mock.calls[0][0];
      expect(command.input.Key).toEqual({
        modelId: 'party-p1',
        owner: 'user-user1',
      });
    });
  });

  describe('batchDestroy', () => {
    it('does nothing sends for an empty list', async () => {
      await adapter.batchDestroy([]);
      expect(send).not.toHaveBeenCalled();
    });

    it('deletes items in a single batch', async () => {
      send.mockResolvedValue({ UnprocessedItems: {} });
      await adapter.batchDestroy([
        { id: 'p1', owner: { id: 'user1', type: Model.USER } },
      ]);
      expect(send).toHaveBeenCalledTimes(1);
      const command = send.mock.calls[0][0];
      expect(command.input.RequestItems.TestTable).toHaveLength(1);
    });

    it('splits more than 25 items into multiple batches', async () => {
      send.mockResolvedValue({ UnprocessedItems: {} });
      const items = Array.from({ length: 26 }, (_, i) => ({
        id: `p${i}`,
        owner: { id: 'user1', type: Model.USER },
      }));
      await adapter.batchDestroy(items);
      // 26 items -> 2 batches
      expect(send).toHaveBeenCalledTimes(2);
    });

    it('retries unprocessed items', async () => {
      send
        .mockResolvedValueOnce({
          UnprocessedItems: {
            TestTable: [{ DeleteRequest: { Key: { modelId: 'party-p1' } } }],
          },
        })
        .mockResolvedValueOnce({ UnprocessedItems: {} });
      await adapter.batchDestroy([
        { id: 'p1', owner: { id: 'user1', type: Model.USER } },
      ]);
      expect(send).toHaveBeenCalledTimes(2);
    });

    it('throws when a batch keeps failing', async () => {
      // Always returns unprocessed -> exceeds max retries -> throws -> collected error
      send.mockResolvedValue({
        UnprocessedItems: {
          TestTable: [{ DeleteRequest: { Key: { modelId: 'party-p1' } } }],
        },
      });
      await expect(
        adapter.batchDestroy([
          { id: 'p1', owner: { id: 'user1', type: Model.USER } },
        ]),
      ).rejects.toThrow('failed batches');
    });
  });
});
