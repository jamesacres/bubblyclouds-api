/**
 * Integration tests for SudokuRepository and SudokuBookRepository against a
 * local DynamoDB instance.
 *
 * Prerequisites:
 *   - Local DynamoDB running at http://localhost:8000
 *     e.g. `npm run dynamodb:start` or
 *          `docker run -p 8000:8000 amazon/dynamodb-local`
 *
 * Run with: npm run test:integration
 */
import { TestingModule } from '@nestjs/testing';
import { SudokuRepository } from '@/sudoku/repository/sudoku.repository';
import { SudokuBookRepository } from '@/sudoku/repository/sudoku-book.repository';
import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';
import { setupDynamoDB, teardownDynamoDB, clearTable } from '../setup/dynamodb';
import { createIntegrationModule } from '../setup/testModule';

jest.setTimeout(60000);

describe('Sudoku repositories (integration)', () => {
  let moduleRef: TestingModule;
  let sudokuRepository: SudokuRepository;
  let sudokuBookRepository: SudokuBookRepository;

  beforeAll(async () => {
    await setupDynamoDB();
    moduleRef = await createIntegrationModule([
      SudokuRepository,
      SudokuBookRepository,
    ]);
    sudokuRepository = moduleRef.get(SudokuRepository);
    sudokuBookRepository = moduleRef.get(SudokuBookRepository);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await teardownDynamoDB();
  });

  beforeEach(async () => {
    await clearTable();
  });

  describe('SudokuRepository', () => {
    it('inserts the sudoku of the day and reads it back', async () => {
      const inserted = await sudokuRepository.insertSudokuOfTheDay(
        {
          difficulty: SudokuQQWingDifficulty.EASY,
          initial: '..1..',
          final: '..final..',
        },
        undefined,
      );

      expect(inserted.sudokuId).toMatch(/^oftheday-\d{8}-easy$/);
      expect(inserted.createdAt).toBeInstanceOf(Date);
      expect(inserted.expiresAt).toBeInstanceOf(Date);

      const found = await sudokuRepository.findSudokuOfTheDay(
        SudokuQQWingDifficulty.EASY,
        undefined,
      );
      expect(found).toBeDefined();
      expect(found?.sudokuId).toBe(inserted.sudokuId);
      expect(found?.initial).toBe('..1..');
      expect(found?.final).toBe('..final..');
    });

    it('returns undefined when the sudoku of the day is not present', async () => {
      const found = await sudokuRepository.findSudokuOfTheDay(
        SudokuQQWingDifficulty.EXPERT,
        undefined,
      );
      expect(found).toBeUndefined();
    });

    it('derives a distinct id for today vs tomorrow', async () => {
      const today = await sudokuRepository.insertSudokuOfTheDay(
        {
          difficulty: SudokuQQWingDifficulty.SIMPLE,
          initial: 'today-initial',
          final: 'today-final',
        },
        undefined,
      );
      const tomorrow = await sudokuRepository.insertSudokuOfTheDay(
        {
          difficulty: SudokuQQWingDifficulty.SIMPLE,
          initial: 'tomorrow-initial',
          final: 'tomorrow-final',
        },
        true,
      );

      expect(tomorrow.sudokuId).not.toBe(today.sudokuId);

      // Each is retrievable only via its matching isTomorrow flag.
      const foundToday = await sudokuRepository.findSudokuOfTheDay(
        SudokuQQWingDifficulty.SIMPLE,
        undefined,
      );
      const foundTomorrow = await sudokuRepository.findSudokuOfTheDay(
        SudokuQQWingDifficulty.SIMPLE,
        true,
      );
      expect(foundToday?.initial).toBe('today-initial');
      expect(foundTomorrow?.initial).toBe('tomorrow-initial');
    });
  });

  describe('SudokuBookRepository', () => {
    const puzzles = [
      {
        difficulty: SudokuQQWingDifficulty.EASY,
        initial: 'p1-initial',
        final: 'p1-final',
      },
    ] as never;

    it('inserts the sudoku book of the month and reads it back', async () => {
      const inserted = await sudokuBookRepository.insertSudokuBookOfTheMonth(
        { puzzles },
        undefined,
      );

      expect(inserted.sudokuBookId).toMatch(/^ofthemonth-\d{6}$/);
      expect(inserted.puzzles).toHaveLength(1);
      expect(inserted.createdAt).toBeInstanceOf(Date);
      expect(inserted.expiresAt).toBeInstanceOf(Date);

      const found =
        await sudokuBookRepository.findSudokuBookOfTheMonth(undefined);
      expect(found).toBeDefined();
      expect(found?.sudokuBookId).toBe(inserted.sudokuBookId);
      expect(found?.puzzles).toHaveLength(1);
    });

    it('returns undefined when the book of the month is not present', async () => {
      const found =
        await sudokuBookRepository.findSudokuBookOfTheMonth(undefined);
      expect(found).toBeUndefined();
    });

    it('derives a distinct id for this month vs next month', async () => {
      const thisMonth = await sudokuBookRepository.insertSudokuBookOfTheMonth(
        { puzzles },
        undefined,
      );
      const nextMonth = await sudokuBookRepository.insertSudokuBookOfTheMonth(
        { puzzles },
        true,
      );
      expect(nextMonth.sudokuBookId).not.toBe(thisMonth.sudokuBookId);
    });
  });
});
