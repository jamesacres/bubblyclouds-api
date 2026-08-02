import { validateApp } from './validateApp';
import { App } from '@/types/enums/app.enum';

describe('validateApp', () => {
  it('returns true for a valid app', () => {
    expect(validateApp(App.SUDOKU)).toBe(true);
    expect(validateApp('sudoku')).toBe(true);
  });

  it('returns false for an unknown app', () => {
    expect(validateApp('unknown')).toBe(false);
    expect(validateApp('')).toBe(false);
  });
});
