import { splitModelId } from './splitModelId';
import { Model } from '@/types/enums/model';
import { BadRequestException } from '@nestjs/common';

describe('splitModelId', () => {
  it('splits a valid model id into type and id', () => {
    expect(splitModelId('party-abc123')).toEqual([Model.PARTY, 'abc123']);
  });

  it('preserves additional hyphens in the id portion', () => {
    expect(splitModelId('session-sudoku-abc-def')).toEqual([
      Model.SESSION,
      'sudoku-abc-def',
    ]);
  });

  it('throws BadRequestException for an unsupported type', () => {
    expect(() => splitModelId('unknown-abc')).toThrow(BadRequestException);
    expect(() => splitModelId('unknown-abc')).toThrow(
      'Unsupported type unknown',
    );
  });
});
