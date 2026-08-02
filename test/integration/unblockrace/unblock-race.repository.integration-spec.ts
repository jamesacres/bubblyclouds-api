/**
 * Integration tests for UnblockRaceRepository and
 * UnblockRaceCollectionRepository against a local DynamoDB instance.
 *
 * Prerequisites:
 *   - Local DynamoDB running at http://localhost:8000
 *     e.g. `npm run dynamodb:start` or
 *          `docker run -p 8000:8000 amazon/dynamodb-local`
 *
 * Run with: npm run test:integration
 */
import { UnblockRacePuzzle } from '@/unblockrace/dto/unblock-race-puzzle';
import { UnblockRaceCollectionRepository } from '@/unblockrace/repository/unblock-race-collection.repository';
import { UnblockRaceRepository } from '@/unblockrace/repository/unblock-race.repository';
import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';
import { TestingModule } from '@nestjs/testing';
import { clearTable, setupDynamoDB, teardownDynamoDB } from '../setup/dynamodb';
import { createIntegrationModule } from '../setup/testModule';

jest.setTimeout(60000);

const puzzles: UnblockRacePuzzle[] = [
  {
    board: 'oBBJCCoDDJKLoAAJKLEEIoooHoIooxHGGGoo',
    moves: 12,
    difficulty: UnblockRaceDifficulty.BEGINNER,
  },
  {
    board: 'oHBBKMFHoJKMFAAJLNGCCoLNGoIxLNooIEEE',
    moves: 38,
    difficulty: UnblockRaceDifficulty.EXPERT,
  },
];

describe('Unblock race repositories (integration)', () => {
  let moduleRef: TestingModule;
  let unblockRaceRepository: UnblockRaceRepository;
  let collectionRepository: UnblockRaceCollectionRepository;

  beforeAll(async () => {
    await setupDynamoDB();
    moduleRef = await createIntegrationModule([
      UnblockRaceRepository,
      UnblockRaceCollectionRepository,
    ]);
    unblockRaceRepository = moduleRef.get(UnblockRaceRepository);
    collectionRepository = moduleRef.get(UnblockRaceCollectionRepository);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await teardownDynamoDB();
  });

  beforeEach(async () => {
    await clearTable();
  });

  describe('UnblockRaceRepository', () => {
    it('inserts the unblock race of the day and reads it back', async () => {
      const inserted = await unblockRaceRepository.insertUnblockRaceOfTheDay(
        { puzzles },
        undefined,
      );

      // One record holds every difficulty, so no difficulty suffix.
      expect(inserted.unblockRaceId).toMatch(/^oftheday-\d{8}$/);
      expect(inserted.createdAt).toBeInstanceOf(Date);
      expect(inserted.expiresAt).toBeInstanceOf(Date);

      const found =
        await unblockRaceRepository.findUnblockRaceOfTheDay(undefined);
      expect(found).toBeDefined();
      expect(found?.unblockRaceId).toBe(inserted.unblockRaceId);
      expect(found?.puzzles).toHaveLength(2);
      // Puzzle objects survive the round trip through DynamoDB intact.
      expect(found?.puzzles[0]).toEqual(puzzles[0]);
      expect(found?.puzzles[1].difficulty).toBe(UnblockRaceDifficulty.EXPERT);
    });

    it('returns undefined when the unblock race of the day is not present', async () => {
      const found =
        await unblockRaceRepository.findUnblockRaceOfTheDay(undefined);

      expect(found).toBeUndefined();
    });

    it('derives a distinct id for today vs tomorrow', async () => {
      const today = await unblockRaceRepository.insertUnblockRaceOfTheDay(
        { puzzles: [puzzles[0]] },
        undefined,
      );
      const tomorrow = await unblockRaceRepository.insertUnblockRaceOfTheDay(
        { puzzles: [puzzles[1]] },
        true,
      );

      expect(tomorrow.unblockRaceId).not.toBe(today.unblockRaceId);

      const foundToday =
        await unblockRaceRepository.findUnblockRaceOfTheDay(undefined);
      const foundTomorrow =
        await unblockRaceRepository.findUnblockRaceOfTheDay(true);
      expect(foundToday?.puzzles[0].moves).toBe(12);
      expect(foundTomorrow?.puzzles[0].moves).toBe(38);
    });
  });

  describe('UnblockRaceCollectionRepository', () => {
    it('inserts the collection of the month and reads it back', async () => {
      const inserted =
        await collectionRepository.insertUnblockRaceCollectionOfTheMonth(
          { puzzles },
          undefined,
        );

      expect(inserted.unblockRaceCollectionId).toMatch(/^ofthemonth-\d{6}$/);
      expect(inserted.puzzles).toHaveLength(2);
      expect(inserted.createdAt).toBeInstanceOf(Date);
      expect(inserted.expiresAt).toBeInstanceOf(Date);

      const found =
        await collectionRepository.findUnblockRaceCollectionOfTheMonth(
          undefined,
        );
      expect(found).toBeDefined();
      expect(found?.unblockRaceCollectionId).toBe(
        inserted.unblockRaceCollectionId,
      );
      expect(found?.puzzles).toEqual(puzzles);
    });

    it('returns undefined when the collection of the month is not present', async () => {
      const found =
        await collectionRepository.findUnblockRaceCollectionOfTheMonth(
          undefined,
        );

      expect(found).toBeUndefined();
    });

    it('derives a distinct id for this month vs next month', async () => {
      const thisMonth =
        await collectionRepository.insertUnblockRaceCollectionOfTheMonth(
          { puzzles },
          undefined,
        );
      const nextMonth =
        await collectionRepository.insertUnblockRaceCollectionOfTheMonth(
          { puzzles },
          true,
        );

      expect(nextMonth.unblockRaceCollectionId).not.toBe(
        thisMonth.unblockRaceCollectionId,
      );
    });

    it('keeps daily and monthly records in separate keyspaces', async () => {
      await unblockRaceRepository.insertUnblockRaceOfTheDay(
        { puzzles },
        undefined,
      );
      await collectionRepository.insertUnblockRaceCollectionOfTheMonth(
        { puzzles },
        undefined,
      );

      // Different models, so both coexist and neither read is affected.
      await expect(
        unblockRaceRepository.findUnblockRaceOfTheDay(undefined),
      ).resolves.toBeDefined();
      await expect(
        collectionRepository.findUnblockRaceCollectionOfTheMonth(undefined),
      ).resolves.toBeDefined();
    });
  });
});
