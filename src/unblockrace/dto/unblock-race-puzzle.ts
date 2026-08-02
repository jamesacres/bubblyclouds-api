import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';

export interface UnblockRacePuzzle {
  /**
   * 36 characters describing a 6x6 grid, row major: 'o' is an empty cell, 'x'
   * a wall, 'A' the car that must escape and any other letter another vehicle.
   */
  board: string;
  /** Minimum number of moves required to solve. */
  moves: number;
  difficulty: UnblockRaceDifficulty;
}
