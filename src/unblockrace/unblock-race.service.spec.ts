import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';
import * as unblockRaceFileFetcher from '@/utils/unblock-race-file-fetcher';
import * as unblockRaceReader from '@/utils/unblock-race-reader';
import * as unblockRaceS3Fetcher from '@/utils/unblock-race-s3-fetcher';
import * as unblockRaceSelection from '@/utils/unblock-race-selection';
import { UnblockRacePuzzle } from './dto/unblock-race-puzzle';
import { UnblockRaceService } from './unblock-race.service';

const puzzles: UnblockRacePuzzle[] = [
  {
    board: 'o'.repeat(36),
    moves: 12,
    difficulty: UnblockRaceDifficulty.BEGINNER,
  },
];

describe('UnblockRaceService', () => {
  let unblockRaceRepository: {
    findUnblockRaceOfTheDay: jest.Mock;
    insertUnblockRaceOfTheDay: jest.Mock;
  };
  let collectionRepository: {
    findUnblockRaceCollectionOfTheMonth: jest.Mock;
    insertUnblockRaceCollectionOfTheMonth: jest.Mock;
  };
  let service: UnblockRaceService;

  const reader = {} as unblockRaceReader.UnblockRaceReader;

  beforeEach(() => {
    process.env.STATIC_BUCKET = 'test-bucket';
    delete process.env.UNBLOCK_RACE_KEY;
    delete process.env.UNBLOCK_RACE_PATH;

    unblockRaceRepository = {
      findUnblockRaceOfTheDay: jest.fn(),
      insertUnblockRaceOfTheDay: jest.fn(),
    };
    collectionRepository = {
      findUnblockRaceCollectionOfTheMonth: jest.fn(),
      insertUnblockRaceCollectionOfTheMonth: jest.fn(),
    };
    service = new UnblockRaceService(
      unblockRaceRepository as never,
      collectionRepository as never,
    );

    jest
      .spyOn(unblockRaceS3Fetcher, 'createS3RangeFetcher')
      .mockReturnValue(jest.fn() as never);
    jest
      .spyOn(unblockRaceFileFetcher, 'createFileRangeFetcher')
      .mockReturnValue(jest.fn() as never);
    jest
      .spyOn(unblockRaceReader.UnblockRaceReader, 'create')
      .mockResolvedValue(reader);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.STATIC_BUCKET;
    delete process.env.UNBLOCK_RACE_KEY;
    delete process.env.UNBLOCK_RACE_PATH;
  });

  describe('unblockRaceOfTheDay', () => {
    it('returns the existing record without generating puzzles', async () => {
      const existing = { unblockRaceId: 'oftheday-20240315', puzzles };
      unblockRaceRepository.findUnblockRaceOfTheDay.mockResolvedValue(existing);
      const select = jest.spyOn(unblockRaceSelection, 'selectDailyPuzzles');

      const result = await service.unblockRaceOfTheDay(undefined);

      expect(result).toBe(existing);
      expect(select).not.toHaveBeenCalled();
      expect(
        unblockRaceRepository.insertUnblockRaceOfTheDay,
      ).not.toHaveBeenCalled();
    });

    it('generates and persists puzzles when none exist', async () => {
      unblockRaceRepository.findUnblockRaceOfTheDay.mockResolvedValue(
        undefined,
      );
      const inserted = { unblockRaceId: 'oftheday-20240315', puzzles };
      unblockRaceRepository.insertUnblockRaceOfTheDay.mockResolvedValue(
        inserted,
      );
      jest
        .spyOn(unblockRaceSelection, 'selectDailyPuzzles')
        .mockResolvedValue(puzzles);

      const result = await service.unblockRaceOfTheDay(undefined);

      expect(result).toBe(inserted);
      expect(unblockRaceSelection.selectDailyPuzzles).toHaveBeenCalledWith(
        reader,
      );
      expect(
        unblockRaceRepository.insertUnblockRaceOfTheDay,
      ).toHaveBeenCalledWith({ puzzles }, undefined);
    });

    it('passes isTomorrow through to the repository', async () => {
      unblockRaceRepository.findUnblockRaceOfTheDay.mockResolvedValue(
        undefined,
      );
      unblockRaceRepository.insertUnblockRaceOfTheDay.mockResolvedValue({});
      jest
        .spyOn(unblockRaceSelection, 'selectDailyPuzzles')
        .mockResolvedValue(puzzles);

      await service.unblockRaceOfTheDay(true);

      expect(
        unblockRaceRepository.findUnblockRaceOfTheDay,
      ).toHaveBeenCalledWith(true);
      expect(
        unblockRaceRepository.insertUnblockRaceOfTheDay,
      ).toHaveBeenCalledWith({ puzzles }, true);
    });

    it('reads the seed file from the configured bucket and default key', async () => {
      unblockRaceRepository.findUnblockRaceOfTheDay.mockResolvedValue(
        undefined,
      );
      unblockRaceRepository.insertUnblockRaceOfTheDay.mockResolvedValue({});
      jest
        .spyOn(unblockRaceSelection, 'selectDailyPuzzles')
        .mockResolvedValue(puzzles);

      await service.unblockRaceOfTheDay(undefined);

      expect(unblockRaceS3Fetcher.createS3RangeFetcher).toHaveBeenCalledWith(
        'test-bucket',
        'unblock-race/puzzles.bin',
      );
    });

    it('honours an overridden seed key', async () => {
      process.env.UNBLOCK_RACE_KEY = 'custom/puzzles.bin';
      unblockRaceRepository.findUnblockRaceOfTheDay.mockResolvedValue(
        undefined,
      );
      unblockRaceRepository.insertUnblockRaceOfTheDay.mockResolvedValue({});
      jest
        .spyOn(unblockRaceSelection, 'selectDailyPuzzles')
        .mockResolvedValue(puzzles);

      await service.unblockRaceOfTheDay(undefined);

      expect(unblockRaceS3Fetcher.createS3RangeFetcher).toHaveBeenCalledWith(
        'test-bucket',
        'custom/puzzles.bin',
      );
    });

    it('falls back to the committed database when no bucket is configured', async () => {
      // Local development: no STATIC_BUCKET, so no AWS credentials are needed.
      delete process.env.STATIC_BUCKET;
      unblockRaceRepository.findUnblockRaceOfTheDay.mockResolvedValue(
        undefined,
      );
      unblockRaceRepository.insertUnblockRaceOfTheDay.mockResolvedValue({});
      jest
        .spyOn(unblockRaceSelection, 'selectDailyPuzzles')
        .mockResolvedValue(puzzles);

      await service.unblockRaceOfTheDay(undefined);

      expect(
        unblockRaceFileFetcher.createFileRangeFetcher,
      ).toHaveBeenCalledWith('static/unblock-race/puzzles.bin');
      expect(unblockRaceS3Fetcher.createS3RangeFetcher).not.toHaveBeenCalled();
    });

    it('honours an overridden local path', async () => {
      delete process.env.STATIC_BUCKET;
      process.env.UNBLOCK_RACE_PATH = '/tmp/custom-puzzles.bin';
      unblockRaceRepository.findUnblockRaceOfTheDay.mockResolvedValue(
        undefined,
      );
      unblockRaceRepository.insertUnblockRaceOfTheDay.mockResolvedValue({});
      jest
        .spyOn(unblockRaceSelection, 'selectDailyPuzzles')
        .mockResolvedValue(puzzles);

      await service.unblockRaceOfTheDay(undefined);

      expect(
        unblockRaceFileFetcher.createFileRangeFetcher,
      ).toHaveBeenCalledWith('/tmp/custom-puzzles.bin');
    });

    it('prefers S3 over the local file when a bucket is configured', async () => {
      // Deployed environments always set STATIC_BUCKET.
      process.env.UNBLOCK_RACE_PATH = '/tmp/custom-puzzles.bin';
      unblockRaceRepository.findUnblockRaceOfTheDay.mockResolvedValue(
        undefined,
      );
      unblockRaceRepository.insertUnblockRaceOfTheDay.mockResolvedValue({});
      jest
        .spyOn(unblockRaceSelection, 'selectDailyPuzzles')
        .mockResolvedValue(puzzles);

      await service.unblockRaceOfTheDay(undefined);

      expect(unblockRaceS3Fetcher.createS3RangeFetcher).toHaveBeenCalled();
      expect(
        unblockRaceFileFetcher.createFileRangeFetcher,
      ).not.toHaveBeenCalled();
    });
  });

  describe('unblockRaceCollectionOfTheMonth', () => {
    it('returns the existing collection without generating puzzles', async () => {
      const existing = {
        unblockRaceCollectionId: 'ofthemonth-202403',
        puzzles,
      };
      collectionRepository.findUnblockRaceCollectionOfTheMonth.mockResolvedValue(
        existing,
      );
      const select = jest.spyOn(
        unblockRaceSelection,
        'selectCollectionPuzzles',
      );

      const result = await service.unblockRaceCollectionOfTheMonth(undefined);

      expect(result).toBe(existing);
      expect(select).not.toHaveBeenCalled();
    });

    it('generates and persists a collection when none exists', async () => {
      collectionRepository.findUnblockRaceCollectionOfTheMonth.mockResolvedValue(
        undefined,
      );
      const inserted = {
        unblockRaceCollectionId: 'ofthemonth-202403',
        puzzles,
      };
      collectionRepository.insertUnblockRaceCollectionOfTheMonth.mockResolvedValue(
        inserted,
      );
      jest
        .spyOn(unblockRaceSelection, 'selectCollectionPuzzles')
        .mockResolvedValue(puzzles);

      const result = await service.unblockRaceCollectionOfTheMonth(undefined);

      expect(result).toBe(inserted);
      expect(unblockRaceSelection.selectCollectionPuzzles).toHaveBeenCalledWith(
        reader,
      );
      expect(
        collectionRepository.insertUnblockRaceCollectionOfTheMonth,
      ).toHaveBeenCalledWith({ puzzles }, undefined);
    });

    it('passes isNextMonth through to the repository', async () => {
      collectionRepository.findUnblockRaceCollectionOfTheMonth.mockResolvedValue(
        undefined,
      );
      collectionRepository.insertUnblockRaceCollectionOfTheMonth.mockResolvedValue(
        {},
      );
      jest
        .spyOn(unblockRaceSelection, 'selectCollectionPuzzles')
        .mockResolvedValue(puzzles);

      await service.unblockRaceCollectionOfTheMonth(true);

      expect(
        collectionRepository.findUnblockRaceCollectionOfTheMonth,
      ).toHaveBeenCalledWith(true);
      expect(
        collectionRepository.insertUnblockRaceCollectionOfTheMonth,
      ).toHaveBeenCalledWith({ puzzles }, true);
    });

    it('propagates selection failures rather than persisting a partial collection', async () => {
      collectionRepository.findUnblockRaceCollectionOfTheMonth.mockResolvedValue(
        undefined,
      );
      jest
        .spyOn(unblockRaceSelection, 'selectCollectionPuzzles')
        .mockRejectedValue(new Error('S3 unavailable'));

      await expect(
        service.unblockRaceCollectionOfTheMonth(undefined),
      ).rejects.toThrow('S3 unavailable');
      expect(
        collectionRepository.insertUnblockRaceCollectionOfTheMonth,
      ).not.toHaveBeenCalled();
    });
  });
});
