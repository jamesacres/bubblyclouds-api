import { UnblockRaceCollection } from '../dto/unblock-race-collection';
import { UnblockRacePuzzle } from '../dto/unblock-race-puzzle';

export class UnblockRaceCollectionEntity implements UnblockRaceCollection {
  unblockRaceCollectionId: string;
  puzzles: UnblockRacePuzzle[];
  expiresAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    unblockRaceCollectionId,
    puzzles,
    expiresAt,
    createdAt,
    updatedAt,
  }: UnblockRaceCollection) {
    this.unblockRaceCollectionId = unblockRaceCollectionId;
    this.puzzles = puzzles;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
