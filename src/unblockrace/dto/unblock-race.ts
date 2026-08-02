import { UnblockRacePuzzle } from './unblock-race-puzzle';

export interface UnblockRace {
  unblockRaceId: string;
  /**
   * The day's five puzzles in increasing difficulty. Unlike sudoku, all
   * difficulties live in a single record so clients need only one request.
   */
  puzzles: UnblockRacePuzzle[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
