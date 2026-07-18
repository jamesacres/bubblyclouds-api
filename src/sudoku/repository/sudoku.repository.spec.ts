import { SudokuRepository } from './sudoku.repository';
import { SudokuBookRepository } from './sudoku-book.repository';
import { SudokuEntity } from '../entities/sudoku.entity';
import { SudokuBookEntity } from '../entities/sudoku-book.entity';
import { Model } from '@/types/enums/model';
import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';

const makeAdapter = () => ({
  upsert: jest.fn(),
  findByIdAndOwner: jest.fn(),
});

describe('SudokuRepository', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let repository: SudokuRepository;

  beforeEach(() => {
    adapter = makeAdapter();
    repository = new SudokuRepository({
      createAdapter: () => adapter,
    } as never);
    jest.useFakeTimers().setSystemTime(new Date('2024-03-15T10:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('insertSudokuOfTheDay builds a dated id and expiry, owned by oftheday', async () => {
    adapter.upsert.mockResolvedValue({
      sudokuId: 'x',
      difficulty: SudokuQQWingDifficulty.EASY,
      initial: '.',
      final: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await repository.insertSudokuOfTheDay(
      {
        difficulty: SudokuQQWingDifficulty.EASY,
        initial: '.',
        final: '1',
      },
      undefined,
    );
    expect(result).toBeInstanceOf(SudokuEntity);
    const [id, , owner, expiresAt] = adapter.upsert.mock.calls[0];
    expect(id).toBe('oftheday-20240315-easy');
    expect(owner).toEqual({ id: 'oftheday', type: Model.SUDOKU });
    expect(expiresAt).toBeInstanceOf(Date);
  });

  it('insertSudokuOfTheDay uses tomorrow when isTomorrow is set', async () => {
    adapter.upsert.mockResolvedValue({
      sudokuId: 'x',
      difficulty: SudokuQQWingDifficulty.EASY,
      initial: '.',
      final: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repository.insertSudokuOfTheDay(
      { difficulty: SudokuQQWingDifficulty.EASY, initial: '.', final: '1' },
      true,
    );
    const [id] = adapter.upsert.mock.calls[0];
    expect(id).toBe('oftheday-20240316-easy');
  });

  it('findSudokuOfTheDay looks up by the dated id', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(undefined);
    const result = await repository.findSudokuOfTheDay(
      SudokuQQWingDifficulty.EXPERT,
      undefined,
    );
    expect(result).toBeUndefined();
    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith(
      'oftheday-20240315-expert',
      { id: 'oftheday', type: Model.SUDOKU },
    );
  });
});

describe('SudokuBookRepository', () => {
  let adapter: ReturnType<typeof makeAdapter>;
  let repository: SudokuBookRepository;

  beforeEach(() => {
    adapter = makeAdapter();
    repository = new SudokuBookRepository({
      createAdapter: () => adapter,
    } as never);
    jest.useFakeTimers().setSystemTime(new Date('2024-03-15T10:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('insertSudokuBookOfTheMonth builds a month id and expiry', async () => {
    adapter.upsert.mockResolvedValue({
      sudokuBookId: 'x',
      puzzles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await repository.insertSudokuBookOfTheMonth(
      { puzzles: [] },
      undefined,
    );
    expect(result).toBeInstanceOf(SudokuBookEntity);
    const [id, , owner] = adapter.upsert.mock.calls[0];
    expect(id).toBe('ofthemonth-202403');
    expect(owner).toEqual({ id: 'ofthemonth', type: Model.SUDOKU_BOOK });
  });

  it('insertSudokuBookOfTheMonth uses next month when requested', async () => {
    adapter.upsert.mockResolvedValue({
      sudokuBookId: 'x',
      puzzles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repository.insertSudokuBookOfTheMonth({ puzzles: [] }, true);
    const [id] = adapter.upsert.mock.calls[0];
    expect(id).toBe('ofthemonth-202404');
  });

  it('findSudokuBookOfTheMonth looks up by the month id', async () => {
    adapter.findByIdAndOwner.mockResolvedValue(undefined);
    await repository.findSudokuBookOfTheMonth(undefined);
    expect(adapter.findByIdAndOwner).toHaveBeenCalledWith('ofthemonth-202403', {
      id: 'ofthemonth',
      type: Model.SUDOKU_BOOK,
    });
  });
});
