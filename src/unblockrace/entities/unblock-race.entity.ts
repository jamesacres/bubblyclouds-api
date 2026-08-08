import { UnblockRace } from '../dto/unblock-race';
import { UnblockRacePuzzle } from '../dto/unblock-race-puzzle';

export class UnblockRaceEntity implements UnblockRace {
  unblockRaceId: string;
  puzzles: UnblockRacePuzzle[];
  expiresAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    unblockRaceId,
    puzzles,
    expiresAt,
    createdAt,
    updatedAt,
  }: UnblockRace) {
    this.unblockRaceId = unblockRaceId;
    this.puzzles = puzzles;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
