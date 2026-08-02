import { zstdCompressSync } from 'zlib';
import { RangeFetcher, UnblockRaceReader } from './unblock-race-reader';

const BOARD_LEN = 36;

/**
 * Builds a synthetic RUSH3 file so the reader can be exercised without the real
 * 19MB puzzles.bin. Layout mirrors the production format exactly:
 * magic, n/blockSize/nBlocks, RLE score table, board offsets, counts offsets,
 * then the zstd-compressed board blocks.
 */
function buildPuzzleFile(options: {
  boards: string[];
  /** [score, runLength] pairs, in file order (descending score). */
  runs: [number, number][];
  blockSize: number;
  magic?: string;
}): Buffer {
  const { boards, runs, blockSize, magic = 'RUSH3\0' } = options;
  const nBlocks = Math.ceil(boards.length / blockSize);

  const blocks: Buffer[] = [];
  for (let b = 0; b < nBlocks; b++) {
    const slice = boards.slice(b * blockSize, (b + 1) * blockSize).join('');
    blocks.push(zstdCompressSync(Buffer.from(slice, 'ascii')));
  }

  // Offset tables hold nBlocks + 1 entries: the start of each block plus the end.
  const boardOffsets: bigint[] = [0n];
  for (const block of blocks) {
    boardOffsets.push(
      boardOffsets[boardOffsets.length - 1] + BigInt(block.length),
    );
  }
  // The counts area is never read, but its offset table still has to be skipped.
  const countsOffsets: bigint[] = boardOffsets.map((_, i) => BigInt(i * 3));

  const head = Buffer.alloc(
    6 +
      12 +
      4 +
      runs.length * 5 +
      4 +
      boardOffsets.length * 8 +
      4 +
      countsOffsets.length * 8,
  );
  let pos = head.write(magic, 0, 'ascii');
  head.writeUInt32LE(boards.length, pos);
  head.writeUInt32LE(blockSize, pos + 4);
  head.writeUInt32LE(nBlocks, pos + 8);
  pos += 12;

  head.writeUInt32LE(runs.length, pos);
  pos += 4;
  for (const [score, run] of runs) {
    head.writeUInt8(score, pos);
    head.writeUInt32LE(run, pos + 1);
    pos += 5;
  }

  head.writeUInt32LE(boardOffsets.length, pos);
  pos += 4;
  for (const offset of boardOffsets) {
    head.writeBigUInt64LE(offset, pos);
    pos += 8;
  }

  head.writeUInt32LE(countsOffsets.length, pos);
  pos += 4;
  for (const offset of countsOffsets) {
    head.writeBigUInt64LE(offset, pos);
    pos += 8;
  }

  return Buffer.concat([head, ...blocks]);
}

/** Serves ranges out of an in-memory buffer, recording each call. */
function fetcherFor(file: Buffer): {
  fetch: RangeFetcher;
  calls: [number, number][];
} {
  const calls: [number, number][] = [];
  const fetch: RangeFetcher = async (start, length) => {
    calls.push([start, length]);
    return file.subarray(start, start + length);
  };
  return { fetch, calls };
}

const board = (char: string) => char.repeat(BOARD_LEN);

describe('UnblockRaceReader', () => {
  // 5 records over 3 blocks; scores 9,9,5,5,1 descending like the real file.
  const boards = [board('A'), board('B'), board('C'), board('D'), board('E')];
  const runs: [number, number][] = [
    [9, 2],
    [5, 2],
    [1, 1],
  ];
  const file = buildPuzzleFile({ boards, runs, blockSize: 2 });

  it('parses the header and exposes the record count', async () => {
    const { fetch } = fetcherFor(file);
    const reader = await UnblockRaceReader.create(fetch);

    expect(reader.n).toBe(5);
  });

  it('reads the header in a single fetch', async () => {
    const { fetch, calls } = fetcherFor(file);
    await UnblockRaceReader.create(fetch);

    expect(calls).toEqual([[0, 4096]]);
  });

  it('returns the board and score for every index', async () => {
    const { fetch } = fetcherFor(file);
    const reader = await UnblockRaceReader.create(fetch);

    await expect(reader.get(0)).resolves.toEqual({
      score: 9,
      board: board('A'),
    });
    await expect(reader.get(1)).resolves.toEqual({
      score: 9,
      board: board('B'),
    });
    await expect(reader.get(2)).resolves.toEqual({
      score: 5,
      board: board('C'),
    });
    await expect(reader.get(3)).resolves.toEqual({
      score: 5,
      board: board('D'),
    });
    await expect(reader.get(4)).resolves.toEqual({
      score: 1,
      board: board('E'),
    });
  });

  it('caches decompressed blocks so repeat reads do not refetch', async () => {
    const { fetch, calls } = fetcherFor(file);
    const reader = await UnblockRaceReader.create(fetch);
    calls.length = 0;

    // Indices 0 and 1 share block 0.
    await reader.get(0);
    await reader.get(1);
    expect(calls).toHaveLength(1);

    // Index 2 lives in block 1, so one more fetch.
    await reader.get(2);
    expect(calls).toHaveLength(2);

    // Re-reading block 0 is served from cache.
    await reader.get(0);
    expect(calls).toHaveLength(2);
  });

  it('rejects a file without the RUSH3 magic', async () => {
    const wrong = buildPuzzleFile({
      boards,
      runs,
      blockSize: 2,
      magic: 'NOPE0\0',
    });
    const { fetch } = fetcherFor(wrong);

    await expect(UnblockRaceReader.create(fetch)).rejects.toThrow(
      'Not a RUSH3 file',
    );
  });

  it.each([
    ['negative', -1],
    ['equal to n', 5],
    ['beyond n', 99],
    ['fractional', 1.5],
  ])('throws for an index that is %s', async (_label, index) => {
    const { fetch } = fetcherFor(file);
    const reader = await UnblockRaceReader.create(fetch);

    await expect(reader.get(index)).rejects.toThrow(RangeError);
  });
});
