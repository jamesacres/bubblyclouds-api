import { SudokuService } from './sudoku.service';
import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';
import { qqwing } from '@/lib/qqwing';
import * as seedReader from '@/utils/sudoku-seed-reader';
import * as scramble from '@/utils/scrambleSudoku';

jest.mock('@/lib/qqwing', () => ({
  qqwing: { generate: jest.fn() },
}));

describe('SudokuService', () => {
  let sudokuRepository: {
    findSudokuOfTheDay: jest.Mock;
    insertSudokuOfTheDay: jest.Mock;
  };
  let sudokuBookRepository: {
    findSudokuBookOfTheMonth: jest.Mock;
    insertSudokuBookOfTheMonth: jest.Mock;
  };
  let service: SudokuService;

  beforeEach(() => {
    sudokuRepository = {
      findSudokuOfTheDay: jest.fn(),
      insertSudokuOfTheDay: jest.fn(),
    };
    sudokuBookRepository = {
      findSudokuBookOfTheMonth: jest.fn(),
      insertSudokuBookOfTheMonth: jest.fn(),
    };
    service = new SudokuService(
      sudokuRepository as never,
      sudokuBookRepository as never,
    );
  });

  afterEach(() => jest.restoreAllMocks());

  describe('sudokuOfTheDay', () => {
    it('returns the existing sudoku when one already exists', async () => {
      sudokuRepository.findSudokuOfTheDay.mockResolvedValue({ sudokuId: 'x' });
      const result = await service.sudokuOfTheDay(
        SudokuQQWingDifficulty.EASY,
        undefined,
      );
      expect(result).toEqual({ sudokuId: 'x' });
      expect(qqwing.generate).not.toHaveBeenCalled();
    });

    it('generates and stores a new sudoku when none exists', async () => {
      sudokuRepository.findSudokuOfTheDay.mockResolvedValue(undefined);
      (qqwing.generate as jest.Mock).mockResolvedValue({
        initial: '.',
        final: '1',
      });
      sudokuRepository.insertSudokuOfTheDay.mockResolvedValue({
        sudokuId: 'y',
      });

      const result = await service.sudokuOfTheDay(
        SudokuQQWingDifficulty.EASY,
        true,
      );
      expect(qqwing.generate).toHaveBeenCalledWith(SudokuQQWingDifficulty.EASY);
      expect(sudokuRepository.insertSudokuOfTheDay).toHaveBeenCalledWith(
        { difficulty: SudokuQQWingDifficulty.EASY, final: '1', initial: '.' },
        true,
      );
      expect(result).toEqual({ sudokuId: 'y' });
    });
  });

  describe('sudokuBookOfTheMonth', () => {
    it('returns the existing book when one already exists', async () => {
      sudokuBookRepository.findSudokuBookOfTheMonth.mockResolvedValue({
        sudokuBookId: 'b',
      });
      const result = await service.sudokuBookOfTheMonth(undefined);
      expect(result).toEqual({ sudokuBookId: 'b' });
    });

    it('generates, scrambles and stores a new book when none exists', async () => {
      sudokuBookRepository.findSudokuBookOfTheMonth.mockResolvedValue(
        undefined,
      );
      jest
        .spyOn(seedReader, 'generateSudokuSelection')
        .mockReturnValue([
          { initial: 'a', final: 'b', difficulty: {}, techniques: {} } as never,
        ]);
      jest
        .spyOn(scramble, 'scrambleSudoku')
        .mockReturnValue({ puzzle: 'scrambled', solution: 'solved' });
      sudokuBookRepository.insertSudokuBookOfTheMonth.mockResolvedValue({
        sudokuBookId: 'new',
      });

      const result = await service.sudokuBookOfTheMonth(true);
      expect(scramble.scrambleSudoku).toHaveBeenCalledWith('a', 'b');
      const [payload, isNextMonth] =
        sudokuBookRepository.insertSudokuBookOfTheMonth.mock.calls[0];
      expect(isNextMonth).toBe(true);
      expect(payload.puzzles[0]).toMatchObject({
        initial: 'scrambled',
        final: 'solved',
      });
      expect(result).toEqual({ sudokuBookId: 'new' });
    });
  });
});
