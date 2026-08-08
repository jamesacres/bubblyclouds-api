import { closeSync, openSync, readSync } from 'fs';
import { RangeFetcher } from './unblock-race-reader';

/**
 * Builds a RangeFetcher backed by a local file, for local development where
 * there is no S3 bucket to read from.
 *
 * The puzzle database is committed to the repo at static/unblock-race, so
 * pointing UNBLOCK_RACE_PATH at it avoids needing AWS credentials to run the
 * unblock race endpoints locally.
 */
export function createFileRangeFetcher(path: string): RangeFetcher {
  return async (start: number, length: number): Promise<Buffer> => {
    const fd = openSync(path, 'r');
    try {
      const buffer = Buffer.allocUnsafe(length);
      let total = 0;
      while (total < length) {
        const read = readSync(fd, buffer, total, length - total, start + total);
        if (read === 0) {
          break;
        }
        total += read;
      }
      // Reads that run past the end of the file legitimately come up short.
      return total === length ? buffer : buffer.subarray(0, total);
    } finally {
      closeSync(fd);
    }
  };
}
