import { BadRequestException } from '@nestjs/common';
import { SudokuController } from './sudoku.controller';
import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';

// qqwing pulls in a wasm module that is only present after a build, so mock it
jest.mock('@/lib/qqwing', () => ({ qqwing: { generate: jest.fn() } }));

describe('SudokuController', () => {
  let service: {
    sudokuOfTheDay: jest.Mock;
    sudokuBookOfTheMonth: jest.Mock;
  };
  let controller: SudokuController;

  beforeEach(() => {
    service = {
      sudokuOfTheDay: jest.fn(),
      sudokuBookOfTheMonth: jest.fn(),
    };
    controller = new SudokuController(service as never);
  });

  describe('ofTheDay', () => {
    it('returns the sudoku of the day for a valid difficulty', async () => {
      service.sudokuOfTheDay.mockResolvedValue({ sudokuId: 'x' });
      const result = await controller.ofTheDay(
        {} as never,
        SudokuQQWingDifficulty.EASY,
        undefined,
      );
      expect(service.sudokuOfTheDay).toHaveBeenCalledWith(
        SudokuQQWingDifficulty.EASY,
        undefined,
      );
      expect(result).toEqual({ sudokuId: 'x' });
    });

    it('rejects an invalid difficulty', async () => {
      await expect(
        controller.ofTheDay({} as never, 'impossible' as never, undefined),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('bookOfTheMonth delegates to the service', async () => {
    service.sudokuBookOfTheMonth.mockResolvedValue({ sudokuBookId: 'b' });
    const result = await controller.bookOfTheMonth({} as never, true);
    expect(service.sudokuBookOfTheMonth).toHaveBeenCalledWith(true);
    expect(result).toEqual({ sudokuBookId: 'b' });
  });
});
