import { UnblockRacePuzzle } from './unblock-race-puzzle';

export interface UnblockRaceCollection {
  unblockRaceCollectionId: string;
  /** 50 puzzles with a bell curve difficulty distribution. */
  puzzles: UnblockRacePuzzle[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
