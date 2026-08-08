import { zstdDecompressSync } from 'zlib';

/**
 * Random-access reader for the RUSH3 puzzle database (puzzles.bin).
 *
 * The file packs rows of "<score> <board> <count>" into a compact binary
 * format: scores are stored once as a run-length table (the file is sorted by
 * score descending) and board strings are split into fixed-size blocks
 * compressed independently with zstd. That means any single puzzle can be read
 * by fetching the header plus one ~400KB block, rather than the whole 19MB
 * file — which is why reads go through a RangeFetcher and the file lives in S3
 * instead of the Lambda bundle.
 *
 * The `count` column in the source data is cluster metadata we have no use for,
 * so the counts area of the file is never read.
 *
 * Requires `zlib.zstdDecompressSync` (Node >= 23.8, and recent 22.x). The
 * deployed Lambda pins NODEJS_24_X.
 */

const MAGIC = 'RUSH3\0';
const BOARD_LEN = 36; // 6x6 grid, one char per cell

/**
 * The header is magic + counts + the RLE score table + two offset tables. It
 * measures 1163 bytes for the current file; 4KB gives comfortable headroom for
 * a regenerated database without needing a second round trip.
 */
const HEADER_READ_LEN = 4096;

/**
 * Fetches `length` bytes starting at `start`. Backed by an S3 ranged
 * GetObject in production, or a file descriptor in tests and local scripts.
 */
export type RangeFetcher = (start: number, length: number) => Promise<Buffer>;

export interface UnblockRaceRecord {
  /** Minimum number of moves required to solve, 1-60. */
  score: number;
  /** 36-char 6x6 grid: 'o' empty, 'x' wall, 'A' the escaping car, others vehicles. */
  board: string;
}

export class UnblockRaceReader {
  /** Total number of puzzles in the database. */
  public readonly n: number;
  private readonly blockSize: number;
  private readonly boardOffsets: bigint[];
  private readonly boardAreaStart: number;

  /** Cumulative start index of each score run, ascending. */
  private readonly rleScores: number[];
  private readonly rleCum: number[];

  /** Decompressed blocks, keyed by block index. */
  private readonly blockCache = new Map<number, Buffer>();

  private readonly fetch: RangeFetcher;

  private constructor(init: {
    n: number;
    blockSize: number;
    boardOffsets: bigint[];
    boardAreaStart: number;
    rleScores: number[];
    rleCum: number[];
    fetch: RangeFetcher;
  }) {
    this.n = init.n;
    this.blockSize = init.blockSize;
    this.boardOffsets = init.boardOffsets;
    this.boardAreaStart = init.boardAreaStart;
    this.rleScores = init.rleScores;
    this.rleCum = init.rleCum;
    this.fetch = init.fetch;
  }

  /**
   * Reads and parses the header. One round trip; the returned reader can then
   * serve any index.
   */
  static async create(fetch: RangeFetcher): Promise<UnblockRaceReader> {
    const header = await fetch(0, HEADER_READ_LEN);

    if (header.subarray(0, 6).toString('ascii') !== MAGIC) {
      throw new Error(
        `Not a RUSH3 file: unexpected magic ${header.subarray(0, 6).toString('hex')}`,
      );
    }

    let pos = 6;
    const n = header.readUInt32LE(pos);
    const blockSize = header.readUInt32LE(pos + 4);
    pos += 12; // n, blockSize, nBlocks

    const rleCount = header.readUInt32LE(pos);
    pos += 4;

    const rleScores: number[] = [];
    const rleCum: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < rleCount; i++) {
      rleScores.push(header.readUInt8(pos));
      rleCum.push(cumulative);
      cumulative += header.readUInt32LE(pos + 1);
      pos += 5;
    }

    const boardOffsetCount = header.readUInt32LE(pos);
    pos += 4;
    const boardOffsets: bigint[] = [];
    for (let i = 0; i < boardOffsetCount; i++) {
      boardOffsets.push(header.readBigUInt64LE(pos + i * 8));
    }
    pos += 8 * boardOffsetCount;

    // Skip the counts offset table - the count column is never read.
    const countsOffsetCount = header.readUInt32LE(pos);
    pos += 4 + 8 * countsOffsetCount;

    return new UnblockRaceReader({
      n,
      blockSize,
      boardOffsets,
      boardAreaStart: pos,
      rleScores,
      rleCum,
      fetch,
    });
  }

  /**
   * Resolves the score for a record index via binary search over the run-length
   * table: the largest run whose start index is <= i.
   */
  private scoreForIndex(index: number): number {
    let low = 0;
    let high = this.rleCum.length - 1;
    let answer = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (this.rleCum[mid] <= index) {
        answer = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return this.rleScores[answer];
  }

  private async loadBlock(blockIndex: number): Promise<Buffer> {
    const cached = this.blockCache.get(blockIndex);
    if (cached) {
      return cached;
    }

    const start = this.boardAreaStart + Number(this.boardOffsets[blockIndex]);
    const end = this.boardAreaStart + Number(this.boardOffsets[blockIndex + 1]);
    const block = zstdDecompressSync(await this.fetch(start, end - start));

    this.blockCache.set(blockIndex, block);
    return block;
  }

  /**
   * Reads a single puzzle by its index in the database. Indices run from 0
   * (hardest, 60 moves) to n-1 (easiest, 1 move).
   */
  async get(index: number): Promise<UnblockRaceRecord> {
    if (!Number.isInteger(index) || index < 0 || index >= this.n) {
      throw new RangeError(`Index ${index} out of range [0, ${this.n})`);
    }

    const block = await this.loadBlock(Math.floor(index / this.blockSize));
    const offset = (index % this.blockSize) * BOARD_LEN;

    return {
      score: this.scoreForIndex(index),
      board: block.toString('ascii', offset, offset + BOARD_LEN),
    };
  }
}
