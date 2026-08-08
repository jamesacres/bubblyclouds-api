import { splitAppModelId } from './splitAppModelId';
import { App } from '@/types/enums/app.enum';
import { BadRequestException } from '@nestjs/common';

describe('splitModelId', () => {
  it('splits a valid model id into app and appModelId', () => {
    expect(splitAppModelId('sudoku-abc123')).toEqual({
      app: App.SUDOKU,
      appModelId: 'abc123',
    });
  });

  it('preserves additional hyphens in the app model id', () => {
    expect(splitAppModelId('sudoku-abc-def-ghi')).toEqual({
      app: App.SUDOKU,
      appModelId: 'abc-def-ghi',
    });
  });

  it('throws when the app is invalid', () => {
    expect(() => splitAppModelId('unknown-abc')).toThrow(BadRequestException);
    expect(() => splitAppModelId('unknown-abc')).toThrow('Invalid app');
  });

  it('throws when there is no app model portion', () => {
    expect(() => splitAppModelId('sudoku-')).toThrow('Invalid app model');
  });
});
