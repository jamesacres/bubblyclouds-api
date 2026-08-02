import { splitSessionId } from './splitSessionId';
import { App } from '@/types/enums/app.enum';
import { BadRequestException } from '@nestjs/common';

describe('splitSessionId', () => {
  it('splits a valid session id into app and appSessionId', () => {
    expect(splitSessionId('sudoku-abc123')).toEqual({
      app: App.SUDOKU,
      appSessionId: 'abc123',
    });
  });

  it('preserves additional hyphens in the app session id', () => {
    expect(splitSessionId('sudoku-abc-def-ghi')).toEqual({
      app: App.SUDOKU,
      appSessionId: 'abc-def-ghi',
    });
  });

  it('throws when the app is invalid', () => {
    expect(() => splitSessionId('unknown-abc')).toThrow(BadRequestException);
    expect(() => splitSessionId('unknown-abc')).toThrow('Invalid app');
  });

  it('throws when there is no app session portion', () => {
    expect(() => splitSessionId('sudoku-')).toThrow('Invalid app session');
  });
});
