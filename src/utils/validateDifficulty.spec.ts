import { validateDifficulty } from './validateDifficulty';
import { SudokuQQWingDifficulty } from '@/types/enums/difficulty.enum';

describe('validateDifficulty', () => {
  it('returns true for valid difficulties', () => {
    expect(validateDifficulty(SudokuQQWingDifficulty.SIMPLE)).toBe(true);
    expect(validateDifficulty('easy')).toBe(true);
    expect(validateDifficulty('intermediate')).toBe(true);
    expect(validateDifficulty('expert')).toBe(true);
  });

  it('returns false for an unknown difficulty', () => {
    expect(validateDifficulty('impossible')).toBe(false);
    expect(validateDifficulty('')).toBe(false);
  });
});
