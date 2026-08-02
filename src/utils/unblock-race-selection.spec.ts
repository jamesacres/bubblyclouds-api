import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';
import { UnblockRaceReader } from './unblock-race-reader';
import {
  COLLECTION_SIZE,
  DAILY_SEQUENCE,
  MOVE_DISTRIBUTION,
  UNBLOCK_RACE_INDEX_RANGES,
  SCORE_INDEX_RANGES,
  difficultyForMoves,
  selectCollectionPuzzles,
  selectDailyPuzzles,
} from './unblock-race-selection';

/** Total rows in puzzles.bin; every hardcoded range must stay inside it. */
const DATABASE_SIZE = 2577412;

/**
 * Stands in for a real reader: derives a deterministic score from the index by
 * looking up which score range contains it, so selection logic can be tested
 * without the 19MB database.
 */
function fakeReader(): UnblockRaceReader & { reads: number[] } {
  const reads: number[] = [];
  const reader = {
    n: DATABASE_SIZE,
    reads,
    get: jest.fn(async (index: number) => {
      reads.push(index);
      const entry = Object.entries(SCORE_INDEX_RANGES).find(
        ([, [min, max]]) => index >= min && index <= max,
      );
      // Indices outside the curve's ranges still belong to a band; fall back to
      // the band bounds so daily selection works.
      const score = entry
        ? Number(entry[0])
        : index <= UNBLOCK_RACE_INDEX_RANGES[UnblockRaceDifficulty.EXPERT][1]
          ? 40
          : 1;
      return { score, board: String(index).padStart(36, 'o') };
    }),
  };
  return reader as unknown as UnblockRaceReader & { reads: number[] };
}

describe('difficultyForMoves', () => {
  it.each([
    [1, UnblockRaceDifficulty.BEGINNER],
    [15, UnblockRaceDifficulty.BEGINNER],
    [16, UnblockRaceDifficulty.CHALLENGING],
    [20, UnblockRaceDifficulty.CHALLENGING],
    [21, UnblockRaceDifficulty.HARD],
    [30, UnblockRaceDifficulty.HARD],
    [31, UnblockRaceDifficulty.EXPERT],
    [60, UnblockRaceDifficulty.EXPERT],
  ])('maps %i moves to %s', (moves, expected) => {
    expect(difficultyForMoves(moves)).toBe(expected);
  });
});

describe('distribution tables', () => {
  it('distributes exactly 50 puzzles', () => {
    const total = Object.values(MOVE_DISTRIBUTION).reduce((a, b) => a + b, 0);

    expect(total).toBe(COLLECTION_SIZE);
  });

  it('has an index range for every move count in the distribution', () => {
    for (const moves of Object.keys(MOVE_DISTRIBUTION)) {
      expect(SCORE_INDEX_RANGES[Number(moves)]).toBeDefined();
    }
  });

  it('keeps every score range inside its difficulty band', () => {
    for (const [movesStr, [min, max]] of Object.entries(SCORE_INDEX_RANGES)) {
      const band =
        UNBLOCK_RACE_INDEX_RANGES[difficultyForMoves(Number(movesStr))];

      expect(min).toBeGreaterThanOrEqual(band[0]);
      expect(max).toBeLessThanOrEqual(band[1]);
    }
  });

  it('covers the whole database with contiguous, ordered bands', () => {
    // Hardest first: expert starts at 0 and beginner ends at the last row.
    const bands = [
      UNBLOCK_RACE_INDEX_RANGES[UnblockRaceDifficulty.EXPERT],
      UNBLOCK_RACE_INDEX_RANGES[UnblockRaceDifficulty.HARD],
      UNBLOCK_RACE_INDEX_RANGES[UnblockRaceDifficulty.CHALLENGING],
      UNBLOCK_RACE_INDEX_RANGES[UnblockRaceDifficulty.BEGINNER],
    ];

    expect(bands[0][0]).toBe(0);
    expect(bands[bands.length - 1][1]).toBe(DATABASE_SIZE - 1);
    bands.slice(1).forEach(([min], i) => {
      expect(min).toBe(bands[i][1] + 1);
    });
  });
});

describe('selectDailyPuzzles', () => {
  it('returns five puzzles in the configured difficulty sequence', async () => {
    const puzzles = await selectDailyPuzzles(fakeReader());

    expect(puzzles).toHaveLength(5);
    expect(puzzles.map((p) => p.difficulty)).toEqual([...DAILY_SEQUENCE]);
  });

  it('orders puzzles from fewest to most moves', async () => {
    const puzzles = await selectDailyPuzzles(fakeReader());

    const moves = puzzles.map((p) => p.moves);
    expect([...moves].sort((a, b) => a - b)).toEqual(moves);
  });

  it('draws one index from each band in the daily sequence', async () => {
    const reader = fakeReader();
    await selectDailyPuzzles(reader);

    // Map each index back to the band whose range contains it. Order is by
    // index rather than by sequence position, so compare as a multiset.
    const bands = reader.reads.map((index) => {
      const match = Object.entries(UNBLOCK_RACE_INDEX_RANGES).find(
        ([, [min, max]]) => index >= min && index <= max,
      );
      return match?.[0];
    });

    expect(bands.sort()).toEqual([...DAILY_SEQUENCE].sort());
  });

  it.each([
    ['a constant', 0.5],
    ['the range start', 0],
    ['the range end', 0.9999999999],
  ])(
    'still returns five distinct puzzles when random always returns %s',
    async (_label, value) => {
      // A degenerate RNG makes every draw collide, which must resolve by
      // probing forward rather than retrying forever.
      const reader = fakeReader();
      jest.spyOn(Math, 'random').mockReturnValue(value);

      const puzzles = await selectDailyPuzzles(reader);

      expect(puzzles).toHaveLength(5);
      expect(new Set(reader.reads).size).toBe(5);
      jest.restoreAllMocks();
    },
  );
});

describe('selectCollectionPuzzles', () => {
  it('returns fifty distinct puzzles', async () => {
    const reader = fakeReader();
    const puzzles = await selectCollectionPuzzles(reader);

    expect(puzzles).toHaveLength(COLLECTION_SIZE);
    expect(new Set(reader.reads).size).toBe(COLLECTION_SIZE);
  });

  it('matches the bell curve move distribution exactly', async () => {
    const puzzles = await selectCollectionPuzzles(fakeReader());

    const histogram: Record<number, number> = {};
    for (const puzzle of puzzles) {
      histogram[puzzle.moves] = (histogram[puzzle.moves] ?? 0) + 1;
    }
    expect(histogram).toEqual(MOVE_DISTRIBUTION);
  });

  it('produces the intended per-band split', async () => {
    const puzzles = await selectCollectionPuzzles(fakeReader());

    const byBand: Record<string, number> = {};
    for (const puzzle of puzzles) {
      byBand[puzzle.difficulty] = (byBand[puzzle.difficulty] ?? 0) + 1;
    }
    expect(byBand).toEqual({
      [UnblockRaceDifficulty.BEGINNER]: 10,
      [UnblockRaceDifficulty.CHALLENGING]: 10,
      [UnblockRaceDifficulty.HARD]: 20,
      [UnblockRaceDifficulty.EXPERT]: 10,
    });
  });

  it('orders puzzles from fewest to most moves', async () => {
    const puzzles = await selectCollectionPuzzles(fakeReader());

    const moves = puzzles.map((p) => p.moves);
    expect([...moves].sort((a, b) => a - b)).toEqual(moves);
  });

  it('propagates read failures instead of returning a short collection', async () => {
    const reader = fakeReader();
    (reader.get as jest.Mock).mockRejectedValueOnce(
      new Error('S3 unavailable'),
    );

    await expect(selectCollectionPuzzles(reader)).rejects.toThrow(
      'S3 unavailable',
    );
  });

  it('caps a move count at the number of puzzles its range can supply', async () => {
    // Shrink one range to a single index while the curve wants two puzzles for
    // it; selection must yield 1 rather than looping for an impossible second.
    const original = SCORE_INDEX_RANGES[15];
    (SCORE_INDEX_RANGES as Record<number, [number, number]>)[15] = [
      577576, 577576,
    ];

    try {
      const puzzles = await selectCollectionPuzzles(fakeReader());

      expect(puzzles).toHaveLength(COLLECTION_SIZE - 1);
    } finally {
      (SCORE_INDEX_RANGES as Record<number, [number, number]>)[15] = original;
    }
  });
});
