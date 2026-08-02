import { SudokuEntity } from './sudoku.entity';
import { SudokuBookEntity } from './sudoku-book.entity';
import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';

describe('SudokuEntity', () => {
  it('copies all sudoku fields', () => {
    const now = new Date();
    const entity = new SudokuEntity({
      sudokuId: 'oftheday-20240101-easy',
      difficulty: SudokuQQWingDifficulty.EASY,
      initial: '.'.repeat(81),
      final: '1'.repeat(81),
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
    });
    expect(entity.sudokuId).toBe('oftheday-20240101-easy');
    expect(entity.difficulty).toBe(SudokuQQWingDifficulty.EASY);
    expect(entity.initial).toHaveLength(81);
    expect(entity.final).toHaveLength(81);
  });
});

describe('SudokuBookEntity', () => {
  it('copies all sudoku book fields', () => {
    const now = new Date();
    const puzzles = [{ initial: 'a', final: 'b' }] as never;
    const entity = new SudokuBookEntity({
      sudokuBookId: 'ofthemonth-202401',
      puzzles,
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
    });
    expect(entity.sudokuBookId).toBe('ofthemonth-202401');
    expect(entity.puzzles).toBe(puzzles);
    expect(entity.expiresAt).toBe(now);
  });
});
