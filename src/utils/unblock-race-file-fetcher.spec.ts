import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createFileRangeFetcher } from './unblock-race-file-fetcher';

describe('createFileRangeFetcher', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'unblock-race-'));
    path = join(dir, 'puzzles.bin');
    writeFileSync(path, Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  });

  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reads a range from the start of the file', async () => {
    const fetch = createFileRangeFetcher(path);

    expect([...(await fetch(0, 4))]).toEqual([0, 1, 2, 3]);
  });

  it('reads a range from the middle of the file', async () => {
    const fetch = createFileRangeFetcher(path);

    expect([...(await fetch(4, 3))]).toEqual([4, 5, 6]);
  });

  it('truncates a read that runs past the end of the file', async () => {
    const fetch = createFileRangeFetcher(path);

    // The reader asks for a fixed-size header even on short files.
    expect([...(await fetch(8, 100))]).toEqual([8, 9]);
  });

  it('returns an empty buffer when reading entirely past the end', async () => {
    const fetch = createFileRangeFetcher(path);

    expect(await fetch(50, 10)).toHaveLength(0);
  });

  it('throws when the file does not exist', async () => {
    const fetch = createFileRangeFetcher(join(dir, 'missing.bin'));

    await expect(fetch(0, 4)).rejects.toThrow();
  });
});
