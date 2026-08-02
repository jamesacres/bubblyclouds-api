import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';
import { UnblockRacePuzzle } from './dto/unblock-race-puzzle';
import { UnblockRaceController } from './unblock-race.controller';

const puzzles: UnblockRacePuzzle[] = [
  {
    board: 'o'.repeat(36),
    moves: 12,
    difficulty: UnblockRaceDifficulty.BEGINNER,
  },
];

describe('UnblockRaceController', () => {
  let service: {
    unblockRaceOfTheDay: jest.Mock;
    unblockRaceCollectionOfTheMonth: jest.Mock;
  };
  let controller: UnblockRaceController;

  beforeEach(() => {
    service = {
      unblockRaceOfTheDay: jest.fn(),
      unblockRaceCollectionOfTheMonth: jest.fn(),
    };
    controller = new UnblockRaceController(service as never);
  });

  describe('ofTheDay', () => {
    it("returns the day's puzzles", async () => {
      const expected = { unblockRaceId: 'oftheday-20240315', puzzles };
      service.unblockRaceOfTheDay.mockResolvedValue(expected);

      await expect(controller.ofTheDay(undefined)).resolves.toBe(expected);
      expect(service.unblockRaceOfTheDay).toHaveBeenCalledWith(undefined);
    });

    it('forwards isTomorrow', async () => {
      service.unblockRaceOfTheDay.mockResolvedValue({});

      await controller.ofTheDay(true);

      expect(service.unblockRaceOfTheDay).toHaveBeenCalledWith(true);
    });
  });

  describe('collectionOfTheMonth', () => {
    it("returns the month's collection", async () => {
      const expected = {
        unblockRaceCollectionId: 'ofthemonth-202403',
        puzzles,
      };
      service.unblockRaceCollectionOfTheMonth.mockResolvedValue(expected);

      await expect(controller.collectionOfTheMonth(undefined)).resolves.toBe(
        expected,
      );
      expect(service.unblockRaceCollectionOfTheMonth).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('forwards isNextMonth', async () => {
      service.unblockRaceCollectionOfTheMonth.mockResolvedValue({});

      await controller.collectionOfTheMonth(true);

      expect(service.unblockRaceCollectionOfTheMonth).toHaveBeenCalledWith(
        true,
      );
    });
  });
});
