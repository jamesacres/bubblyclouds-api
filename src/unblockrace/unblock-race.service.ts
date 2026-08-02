import { createFileRangeFetcher } from '@/utils/unblock-race-file-fetcher';
import { RangeFetcher, UnblockRaceReader } from '@/utils/unblock-race-reader';
import { createS3RangeFetcher } from '@/utils/unblock-race-s3-fetcher';
import {
  selectCollectionPuzzles,
  selectDailyPuzzles,
} from '@/utils/unblock-race-selection';
import { Injectable } from '@nestjs/common';
import { UnblockRace } from './dto/unblock-race';
import { UnblockRaceCollection } from './dto/unblock-race-collection';
import { UnblockRaceCollectionRepository } from './repository/unblock-race-collection.repository';
import { UnblockRaceRepository } from './repository/unblock-race.repository';

const DEFAULT_UNBLOCK_RACE_KEY = 'unblock-race/puzzles.bin';

/**
 * Where the committed puzzle database sits relative to the repo root, used as
 * the local development fallback. Not available in Lambda: static/ is
 * deliberately excluded from the bundle (see CLAUDE.md), so deployed
 * environments always read from S3.
 */
const LOCAL_UNBLOCK_RACE_PATH = 'static/unblock-race/puzzles.bin';

@Injectable()
export class UnblockRaceService {
  constructor(
    private readonly unblockRaceRepository: UnblockRaceRepository,
    private readonly unblockRaceCollectionRepository: UnblockRaceCollectionRepository,
  ) {}

  /**
   * Opens the puzzle database. A reader is created per generation rather than
   * cached: it holds decompressed blocks, which are worth keeping for the
   * duration of one selection but not between requests.
   *
   * Reads from S3 when STATIC_BUCKET is configured, which is always the case
   * in deployed environments. Locally neither variable is usually set, so it
   * falls back to the committed database and `npm run start:dev` works with no
   * AWS credentials. UNBLOCK_RACE_PATH overrides the fallback location.
   */
  private async createReader(): Promise<UnblockRaceReader> {
    return UnblockRaceReader.create(this.createFetcher());
  }

  private createFetcher(): RangeFetcher {
    const bucket = process.env.STATIC_BUCKET;
    if (bucket) {
      const key = process.env.UNBLOCK_RACE_KEY || DEFAULT_UNBLOCK_RACE_KEY;
      return createS3RangeFetcher(bucket, key);
    }

    return createFileRangeFetcher(
      process.env.UNBLOCK_RACE_PATH || LOCAL_UNBLOCK_RACE_PATH,
    );
  }

  async unblockRaceOfTheDay(
    isTomorrow: boolean | undefined,
  ): Promise<UnblockRace> {
    // Look up to see if today's puzzles have already been generated.
    // If they haven't, generate and return them.
    let unblockRace =
      await this.unblockRaceRepository.findUnblockRaceOfTheDay(isTomorrow);
    if (!unblockRace) {
      const puzzles = await selectDailyPuzzles(await this.createReader());
      unblockRace = await this.unblockRaceRepository.insertUnblockRaceOfTheDay(
        { puzzles },
        isTomorrow,
      );
    }
    return unblockRace;
  }

  async unblockRaceCollectionOfTheMonth(
    isNextMonth: boolean | undefined,
  ): Promise<UnblockRaceCollection> {
    // Generate a collection of 50 puzzles with a bell curve difficulty distribution
    let collection =
      await this.unblockRaceCollectionRepository.findUnblockRaceCollectionOfTheMonth(
        isNextMonth,
      );
    if (!collection) {
      const puzzles = await selectCollectionPuzzles(await this.createReader());
      collection =
        await this.unblockRaceCollectionRepository.insertUnblockRaceCollectionOfTheMonth(
          { puzzles },
          isNextMonth,
        );
    }
    return collection;
  }
}
