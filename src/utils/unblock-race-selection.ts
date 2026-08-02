import { UnblockRaceDifficulty } from '@/types/enums/difficulty.enum';
import { UnblockRaceReader } from './unblock-race-reader';

/**
 * Puzzle selection for the unblock race daily and monthly endpoints.
 *
 * puzzles.bin is sorted hardest first (60 moves) to easiest last (1 move), so a
 * difficulty band is a contiguous index range. The ranges below were derived
 * from the plain-text source dump by accumulating the per-score row counts, and
 * are hardcoded so we never have to scan the binary to find them.
 *
 * Regenerate with: awk '{print $1}' <source dump> | uniq -c
 */

export interface UnblockRacePuzzleSelection {
  /** 36-char 6x6 grid: 'o' empty, 'x' wall, 'A' the escaping car. */
  board: string;
  /** Minimum moves required to solve. */
  moves: number;
  difficulty: UnblockRaceDifficulty;
}

/** Inclusive [minIndex, maxIndex] into puzzles.bin for each difficulty band. */
export const UNBLOCK_RACE_INDEX_RANGES: Record<
  UnblockRaceDifficulty,
  [number, number]
> = {
  [UnblockRaceDifficulty.EXPERT]: [0, 7756], // 31-60 moves
  [UnblockRaceDifficulty.HARD]: [7757, 152244], // 21-30 moves
  [UnblockRaceDifficulty.CHALLENGING]: [152245, 577575], // 16-20 moves
  [UnblockRaceDifficulty.BEGINNER]: [577576, 2577411], // 1-15 moves
};

/**
 * The five daily puzzles, in increasing difficulty. There are only four bands,
 * so one repeats; it lands on Challenging to keep exactly one Beginner and one
 * Expert while easing the ramp toward the harder end.
 */
export const DAILY_SEQUENCE: readonly UnblockRaceDifficulty[] = [
  UnblockRaceDifficulty.BEGINNER,
  UnblockRaceDifficulty.CHALLENGING,
  UnblockRaceDifficulty.CHALLENGING,
  UnblockRaceDifficulty.HARD,
  UnblockRaceDifficulty.EXPERT,
];

export const COLLECTION_SIZE = 50;

/**
 * Bell curve over move counts (Gaussian mu=23, sigma=9 across 6-48 moves,
 * apportioned to exactly 50 by largest remainder). Spreading across individual
 * move counts rather than the four bands gives a smoother ramp; it works out to
 * Beginner 10 / Challenging 10 / Hard 20 / Expert 10.
 */
export const MOVE_DISTRIBUTION: Readonly<Record<number, number>> = {
  7: 1,
  8: 1,
  9: 1,
  10: 1,
  11: 1,
  12: 1,
  13: 1,
  14: 1,
  15: 2,
  16: 2,
  17: 2,
  18: 2,
  19: 2,
  20: 2,
  21: 2,
  22: 2,
  23: 2,
  24: 2,
  25: 2,
  26: 2,
  27: 2,
  28: 2,
  29: 2,
  30: 2,
  31: 2,
  32: 1,
  33: 1,
  34: 1,
  35: 1,
  36: 1,
  37: 1,
  38: 1,
  39: 1,
};

/** Inclusive [minIndex, maxIndex] for each move count used by MOVE_DISTRIBUTION. */
export const SCORE_INDEX_RANGES: Readonly<Record<number, [number, number]>> = {
  7: [2412682, 2518413],
  8: [2236460, 2412681],
  9: [1990153, 2236459],
  10: [1696046, 1990152],
  11: [1396300, 1696045],
  12: [1128432, 1396299],
  13: [907256, 1128431],
  14: [727035, 907255],
  15: [577576, 727034],
  16: [452694, 577575],
  17: [349953, 452693],
  18: [267487, 349952],
  19: [202610, 267486],
  20: [152245, 202609],
  21: [113712, 152244],
  22: [84358, 113711],
  23: [62386, 84357],
  24: [46004, 62385],
  25: [33870, 46003],
  26: [25117, 33869],
  27: [18538, 25116],
  28: [13786, 18537],
  29: [10224, 13785],
  30: [7757, 10223],
  31: [5919, 7756],
  32: [4458, 5918],
  33: [3398, 4457],
  34: [2537, 3397],
  35: [1883, 2536],
  36: [1395, 1882],
  37: [1022, 1394],
  38: [776, 1021],
  39: [567, 775],
};

/** Maps a move count to the difficulty band it falls in. */
export function difficultyForMoves(moves: number): UnblockRaceDifficulty {
  if (moves >= 31) return UnblockRaceDifficulty.EXPERT;
  if (moves >= 21) return UnblockRaceDifficulty.HARD;
  if (moves >= 16) return UnblockRaceDifficulty.CHALLENGING;
  return UnblockRaceDifficulty.BEGINNER;
}

/**
 * Picks `count` distinct indices from an inclusive range, skipping any already
 * in `taken`. The ranges hold thousands of puzzles each so collisions are
 * vanishingly rare, but the daily sequence draws twice from Challenging and a
 * repeated puzzle would be obvious to a player.
 *
 * Random probing falls back to a linear scan rather than retrying forever, so
 * the loop terminates even if the range is small or nearly exhausted.
 */
function selectDistinctIndices(
  [min, max]: [number, number],
  count: number,
  taken: Set<number>,
): number[] {
  const size = max - min + 1;
  const selected: number[] = [];
  // Never ask for more than the range can supply, so the search always ends.
  const wanted = Math.min(count, size);

  while (selected.length < wanted) {
    let index = min + Math.floor(Math.random() * size);

    // Walk forward to the next free slot. One must exist: fewer than `size`
    // indices from this range are taken, otherwise `wanted` would be reached.
    while (taken.has(index)) {
      index = index === max ? min : index + 1;
    }

    taken.add(index);
    selected.push(index);
  }

  return selected;
}

async function readPuzzles(
  reader: UnblockRaceReader,
  indices: number[],
): Promise<UnblockRacePuzzleSelection[]> {
  const puzzles: UnblockRacePuzzleSelection[] = [];

  for (const index of indices) {
    const { board, score } = await reader.get(index);
    puzzles.push({
      board,
      moves: score,
      difficulty: difficultyForMoves(score),
    });
  }

  return puzzles;
}

/**
 * Five puzzles in increasing difficulty for the daily endpoint.
 */
export async function selectDailyPuzzles(
  reader: UnblockRaceReader,
): Promise<UnblockRacePuzzleSelection[]> {
  const taken = new Set<number>();
  const indices = DAILY_SEQUENCE.map(
    (difficulty) =>
      selectDistinctIndices(UNBLOCK_RACE_INDEX_RANGES[difficulty], 1, taken)[0],
  );

  // Indices are sorted descending because the file runs hardest to easiest,
  // which yields puzzles in increasing difficulty.
  return readPuzzles(
    reader,
    indices.sort((a, b) => b - a),
  );
}

/**
 * Fifty puzzles on a bell curve for the monthly collection, ordered easiest to
 * hardest.
 */
export async function selectCollectionPuzzles(
  reader: UnblockRaceReader,
): Promise<UnblockRacePuzzleSelection[]> {
  const taken = new Set<number>();
  const indices: number[] = [];

  for (const [moves, count] of Object.entries(MOVE_DISTRIBUTION)) {
    indices.push(
      ...selectDistinctIndices(SCORE_INDEX_RANGES[Number(moves)], count, taken),
    );
  }

  return readPuzzles(
    reader,
    indices.sort((a, b) => b - a),
  );
}
