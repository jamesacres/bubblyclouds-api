import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';
import { UnblockRacePuzzle } from '../dto/unblock-race-puzzle';
import { UnblockRaceCollectionEntity } from './unblock-race-collection.entity';
import { UnblockRaceEntity } from './unblock-race.entity';

const puzzles: UnblockRacePuzzle[] = [
  {
    board: 'A'.repeat(36),
    moves: 31,
    difficulty: UnblockRaceDifficulty.EXPERT,
  },
];
const createdAt = new Date('2024-03-15T10:00:00.000Z');
const updatedAt = new Date('2024-03-15T11:00:00.000Z');
const expiresAt = new Date('2024-03-16T10:00:00.000Z');

describe('UnblockRaceEntity', () => {
  it('copies every field from the record', () => {
    const entity = new UnblockRaceEntity({
      unblockRaceId: 'oftheday-20240315',
      puzzles,
      expiresAt,
      createdAt,
      updatedAt,
    });

    expect(entity).toEqual({
      unblockRaceId: 'oftheday-20240315',
      puzzles,
      expiresAt,
      createdAt,
      updatedAt,
    });
  });

  it('allows a missing expiry', () => {
    const entity = new UnblockRaceEntity({
      unblockRaceId: 'oftheday-20240315',
      puzzles,
      createdAt,
      updatedAt,
    });

    expect(entity.expiresAt).toBeUndefined();
  });
});

describe('UnblockRaceCollectionEntity', () => {
  it('copies every field from the record', () => {
    const entity = new UnblockRaceCollectionEntity({
      unblockRaceCollectionId: 'ofthemonth-202403',
      puzzles,
      expiresAt,
      createdAt,
      updatedAt,
    });

    expect(entity).toEqual({
      unblockRaceCollectionId: 'ofthemonth-202403',
      puzzles,
      expiresAt,
      createdAt,
      updatedAt,
    });
  });

  it('allows a missing expiry', () => {
    const entity = new UnblockRaceCollectionEntity({
      unblockRaceCollectionId: 'ofthemonth-202403',
      puzzles,
      createdAt,
      updatedAt,
    });

    expect(entity.expiresAt).toBeUndefined();
  });
});
