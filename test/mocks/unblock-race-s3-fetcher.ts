import { join } from 'path';
import type { RangeFetcher } from '@/utils/unblock-race-reader';
import { createFileRangeFetcher } from '@/utils/unblock-race-file-fetcher';

/**
 * Test double for the S3 range fetcher that serves byte ranges from the
 * committed static/unblock-race/puzzles.bin instead of S3.
 *
 * This keeps e2e runs offline while still exercising the real RUSH3 parsing,
 * zstd decompression and puzzle selection against the production data.
 */

const PUZZLES_PATH = join(__dirname, '../../static/unblock-race/puzzles.bin');

// Bucket and key are irrelevant here - callers still pass them, which JS
// happily ignores - so the signature takes no arguments.
export function createS3RangeFetcher(): RangeFetcher {
  return createFileRangeFetcher(PUZZLES_PATH);
}
