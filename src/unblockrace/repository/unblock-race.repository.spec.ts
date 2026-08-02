import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';
import { Model } from '@/types/enums/model';
import { UnblockRacePuzzle } from '../dto/unblock-race-puzzle';
import { UnblockRaceCollectionEntity } from '../entities/unblock-race-collection.entity';
import { UnblockRaceEntity } from '../entities/unblock-race.entity';
import { UnblockRaceCollectionRepository } from './unblock-race-collection.repository';
import { UnblockRaceRepository } from './unblock-race.repository';

const makeAdapter = () => ({
  upsert: jest.fn(),
  findByIdAndOwner: jest.fn(),
});

const puzzles: UnblockRacePuzzle[] = [
  {
    board: 'o'.repeat(36),
    moves: 12,
    difficulty: UnblockRaceDifficulty.BEGINNER,
  },
];

describe('UnblockRaceRepository', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let repository: UnblockRaceRepository;

  beforeEach(() => {
    adapter = makeAdapter();
    repository = new UnblockRaceRepository({
      createAdapter: () => adapter,
    } as never);
    jest.useFakeTimers().setSystemTime(new Date('2024-03-15T10:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('insertUnblockRaceOfTheDay builds a dated id with no difficulty suffix', async () => {
    adapter.upsert.mockResolvedValue({
      unblockRaceId: 'x',
      puzzles,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await repository.insertUnblockRaceOfTheDay(
      { puzzles },
      undefined,
    );

    expect(result).toBeInstanceOf(UnblockRaceEntity);
    const [id, payload, owner, expiresAt] = adapter.upsert.mock.calls[0];
    // All five difficulties live in one record, so the id is date-only.
    expect(id).toBe('oftheday-20240315');
    expect(payload).toEqual({ puzzles, unblockRaceId: 'oftheday-20240315' });
    expect(owner).toEqual({ id: 'oftheday', type: Model.UNBLOCK_RACE });
    expect(expiresAt).toBeInstanceOf(Date);
  });

  it('insertUnblockRaceOfTheDay uses tomorrow when isTomorrow is set', async () => {
    adapter.upsert.mockResolvedValue({
      unblockRaceId: 'x',
      puzzles,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repository.insertUnblockRaceOfTheDay({ puzzles }, true);

    const [id] = adapter.upsert.mock.calls[0];
    expect(id).toBe('oftheday-20240316');
  });

  it('findUnblockRaceOfTheDay looks up by dated id and owner', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(undefined);

    await repository.findUnblockRaceOfTheDay(undefined);

    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith('oftheday-20240315', {
      id: 'oftheday',
      type: Model.UNBLOCK_RACE,
    });
  });

  it('findUnblockRaceOfTheDay looks up tomorrow when isTomorrow is set', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(undefined);

    await repository.findUnblockRaceOfTheDay(true);

    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith(
      'oftheday-20240316',
      expect.anything(),
    );
  });
});

describe('UnblockRaceCollectionRepository', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let repository: UnblockRaceCollectionRepository;

  beforeEach(() => {
    adapter = makeAdapter();
    repository = new UnblockRaceCollectionRepository({
      createAdapter: () => adapter,
    } as never);
    jest.useFakeTimers().setSystemTime(new Date('2024-03-15T10:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('insertUnblockRaceCollectionOfTheMonth builds a monthly id and expiry', async () => {
    adapter.upsert.mockResolvedValue({
      unblockRaceCollectionId: 'x',
      puzzles,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await repository.insertUnblockRaceCollectionOfTheMonth(
      { puzzles },
      undefined,
    );

    expect(result).toBeInstanceOf(UnblockRaceCollectionEntity);
    const [id, payload, owner, expiresAt] = adapter.upsert.mock.calls[0];
    expect(id).toBe('ofthemonth-202403');
    expect(payload).toEqual({
      puzzles,
      unblockRaceCollectionId: 'ofthemonth-202403',
    });
    expect(owner).toEqual({
      id: 'ofthemonth',
      type: Model.UNBLOCK_RACE_COLLECTION,
    });
    // Expiry is pinned to the first of a later month.
    expect((expiresAt as Date).getDate()).toBe(1);
  });

  it('insertUnblockRaceCollectionOfTheMonth uses next month when isNextMonth is set', async () => {
    adapter.upsert.mockResolvedValue({
      unblockRaceCollectionId: 'x',
      puzzles,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repository.insertUnblockRaceCollectionOfTheMonth({ puzzles }, true);

    const [id] = adapter.upsert.mock.calls[0];
    expect(id).toBe('ofthemonth-202404');
  });

  it('findUnblockRaceCollectionOfTheMonth looks up by monthly id and owner', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(undefined);

    await repository.findUnblockRaceCollectionOfTheMonth(undefined);

    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith('ofthemonth-202403', {
      id: 'ofthemonth',
      type: Model.UNBLOCK_RACE_COLLECTION,
    });
  });

  it('findUnblockRaceCollectionOfTheMonth looks up next month when set', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(undefined);

    await repository.findUnblockRaceCollectionOfTheMonth(true);

    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith(
      'ofthemonth-202404',
      expect.anything(),
    );
  });
});
