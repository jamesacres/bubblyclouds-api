# Unblock Race module

## Context

The API currently serves Sudoku puzzles via `src/sudoku` — a daily puzzle
(`ofTheDay`, one record per difficulty) and a monthly 50-puzzle book
(`bookOfTheMonth`) with a bell-curve difficulty spread. We want the same shape
for Rush Hour ("unblock race") puzzles, with two deliberate differences:

- **`ofTheDay` returns all 5 puzzles in one record** in increasing difficulty,
  rather than requiring one call per difficulty as sudoku does. This is one
  DynamoDB item and one HTTP round trip instead of five.
- **`collectionOfTheMonth`** replaces `bookOfTheMonth` naming, still 50 puzzles
  on a bell curve.

Puzzles come from a 2,577,412-row database (`~/Downloads/rush.bin`, RUSH3
format) sorted hardest→easiest. Because the file is 19MB and only read on a
cache miss (once a day, once a month), it is stored in **S3 and read via ranged
GetObject** rather than bundled — keeping `dist/` at 11MB and cold start
unchanged.

## Verified facts

Measured against the real files during planning:

- **Board format**: 36 chars = 6×6 grid. `o` empty, `x` wall, `A` the player's
  car (always the one that must escape), `B`–`O` other vehicles, `O`/`P` seen in
  the alphabet. Score = minimum moves to solve (1–60). The trailing integer is
  cluster metadata — **not needed**, so the `counts` area of the file is never read.
- **Index ranges** (0-indexed, confirmed against `rush.txt` boundary lines):

  | Difficulty | Moves | minIndex | maxIndex | Pool |
  |---|---|---|---|---|
  | Expert | 31–60 | 0 | 7756 | 7,757 |
  | Hard | 21–30 | 7757 | 152244 | 144,488 |
  | Challenging | 16–20 | 152245 | 577575 | 425,331 |
  | Beginner | 1–15 | 577576 | 2577411 | 1,999,836 |

- **RUSH3 layout**: 1,163-byte header (magic, `n`, blockSize=50000,
  nBlocks=52, a 57-entry score run-length table, then board/counts block offset
  tables). Board blocks are zstd, ≤401KB compressed, ~358KB average.
- **Ranged reads work**: a reader issuing HTTP Range requests produces
  byte-identical results to the fd-based reader. Init = one 2KB read; daily
  (5 puzzles) ≈ 1.9MB / 5 requests; monthly (50) ≈ 10MB / 30 requests.
- **Runtime**: Node 24 locally, `Runtime.NODEJS_24_X` in
  `deploy/lib/api-stack.ts` — `zlib.zstdDecompressSync` is available, no npm
  dependency needed.

## Design decisions (confirmed with user)

- **Daily mix**: Beginner, Challenging, Challenging, Hard, Expert — one
  Beginner, one Expert, duplicate lands on Challenging.
- **Selection**: `Math.random()` within each band's index range, matching
  `selectRandomPuzzles` in the sudoku seed reader. The DynamoDB record makes it
  stable for the day/month; first caller decides.
- **Bell curve**: over individual move-counts (not the 4 bands), Gaussian
  µ=23, σ=9 across 6–48 moves, apportioned to exactly 50 by largest-remainder.
  Yields Beginner 10 / Challenging 10 / Hard 20 / Expert 10, with every
  move-count drawing from a pool of 200+ candidates.
- **Storage**: `rush.bin` committed to the repo under `rush-seeds/`, uploaded to
  S3 by a manual `aws s3 sync` script, and read at runtime via ranged
  GetObject. Nothing is bundled into the Lambda asset.
- **Reader location**: `src/utils/` as first-party code with co-located specs
  (subject to the 95%/85% coverage thresholds), not vendored under `src/lib/`.

## Implementation

### 1. Seed data → committed + synced to S3

- Copy `~/Downloads/rush.bin` into the repo as `rush-seeds/rush.bin` and
  **commit it** (checked-in vendored data, like `sudoku-seeds/` and `wasm/`).
  Add it to the CLAUDE.md list of vendored dirs that must never be deleted or
  gitignored. Accepted trade-off: the repo grows 9.5MB → ~29MB permanently, as
  the file is already zstd-compressed internally and git cannot pack it.
- In `deploy/lib/api-stack.ts`, add a **bucket only** (no `BucketDeployment` —
  the file is uploaded by the sync script, keeping the 19MB blob out of the CDK
  asset pipeline). Follow `createExportBucket()` (line ~362) for conventions.
- Grant the API function read access with `seedBucket.grantRead(apiFn)`
  (pattern at line ~433) and pass `RUSH_BUCKET` / `RUSH_KEY` as environment
  variables, mirroring how `EXPORT_BUCKET` is wired at line ~389.
- Export the bucket name as a `CfnOutput` so the sync script can discover it.
- Add `@aws-sdk/client-s3` to the app `package.json` dependencies.
- **Do not** add a `nest-cli.json` assets entry — nothing is bundled into `dist/`.

### 1b. `deploy/scripts/sync-seeds.sh`

Bash script, `chmod +x`, exposed as `"seeds:sync"` in `deploy/package.json`
alongside `cdk:deploy`. Run **manually after** a deploy — not chained, so normal
deploys stay fast.

- `set -euo pipefail`.
- Resolve the bucket from `$RUSH_BUCKET` if set, else via
  `aws cloudformation describe-stacks --stack-name ApiStack` and the seed-bucket
  output key.
- `aws s3 sync ../rush-seeds "s3://$BUCKET/rush-seeds/"` — `sync` compares size
  and mtime, so re-running is a cheap no-op once uploaded.
- Fail with a clear message if the bucket can't be resolved or `rush.bin` is
  missing; echo the resolved bucket and final object key on success.
- Document the "deploy, then `npm run seeds:sync`" order in `deploy/README.md`
  and the root README.

### 2. `src/utils/rush-reader.ts` (+ spec)

Port `~/Downloads/rush_reader.ts` from `openSync`/`readSync` to an injectable
byte-range fetcher, and drop the `counts` handling entirely.

- `export interface RushRecord { score: number; board: string; }`
- `export type RangeFetcher = (start: number, length: number) => Promise<Buffer>;`
- `export class RushReader` with:
  - `static async create(fetch: RangeFetcher)` — one 2KB read parses magic
    (`RUSH3\0`), header, RLE score table and the board offset table. The counts
    offset table is skipped, not stored.
  - `async get(index: number): Promise<RushRecord>` — resolve block via
    `Math.floor(i / blockSize)`, fetch + `zstdDecompressSync` that block,
    slice 36 bytes at `(i % blockSize) * 36`, derive score by binary search on
    the cumulative RLE table (keep `scoreForIndex` as-is).
  - An in-instance `Map<number, Buffer>` block cache so the monthly run
    decompresses each block once (measured: 50 puzzles → 30 fetches, not 50).
- Keep the magic-byte check and short-read guard; throw on out-of-range index.

Spec: generate a small synthetic RUSH3 buffer in the test (a handful of records,
blockSize 2) and drive the reader with an in-memory `RangeFetcher` that slices
that buffer. No S3, no fixtures on disk, no `fs` mocking.

### 3. `src/utils/rush-s3-fetcher.ts` (+ spec)

- `createS3RangeFetcher(client, bucket, key): RangeFetcher` — issues
  `GetObjectCommand` with `Range: bytes=<start>-<end>` and buffers the stream.
- Module-level cached `S3Client` (region from env), following how the app
  already constructs AWS SDK clients.

Spec: mock `@aws-sdk/client-s3`, assert the `Range` header is exact
(`bytes=0-2047`) and that the stream is fully buffered.

### 4. `src/utils/rush-selection.ts` (+ spec)

Pure, no I/O — takes a `RushReader` and returns puzzles.

```ts
export const RUSH_INDEX_RANGES: Record<UnblockRaceDifficulty, [number, number]> = {
  beginner:    [577576, 2577411],
  challenging: [152245,  577575],
  hard:        [  7757,  152244],
  expert:      [     0,    7756],
};

// Daily: increasing difficulty, one Beginner, one Expert.
export const DAILY_SEQUENCE = ['beginner','challenging','challenging','hard','expert'] as const;

// Monthly: Gaussian µ=23 σ=9 over 6..48 moves, largest-remainder to exactly 50.
export const MOVE_DISTRIBUTION: Record<number, number> = { 7:1, 8:1, …, 39:1 };
export const SCORE_INDEX_RANGES: Record<number, [number, number]> = { … };
```

Hardcode both tables (generated during planning from `rush.txt`; a comment
should record that provenance). Export
`selectDailyPuzzles(reader)` and `selectCollectionPuzzles(reader)`; both
de-duplicate selected indices via a `Set` before fetching — collision odds are
tiny but the two Challenging draws make it worth being explicit.

Unlike sudoku's `generateSudokuSelection`, **do not swallow errors** — a failed
read should propagate rather than silently return a short collection.

### 5. `src/unblockrace/` module

Mirrors `src/sudoku` structure exactly. Auth is `@ApiKey()` on both handlers,
matching sudoku.

- `dto/unblock-race.ts` — `interface UnblockRace { unblockRaceId; puzzles: UnblockRacePuzzle[]; expiresAt?; createdAt; updatedAt }`
  (note: 5 puzzles in **one** record, the key departure from sudoku's per-difficulty items)
- `dto/unblock-race-puzzle.ts` / `.dto.ts` — `{ board: string; moves: number; difficulty: UnblockRaceDifficulty }`.
  Far simpler than `SudokuBookPuzzle` — no technique metadata exists in this dataset.
- `dto/unblock-race.dto.ts`, `dto/unblock-race-collection.ts` + `.dto.ts`
- `entities/unblock-race.entity.ts`, `entities/unblock-race-collection.entity.ts`
- `repository/unblock-race.repository.ts` — id `oftheday-YYYYMMDD` (**no
  difficulty suffix**, since one record holds all 5), owner
  `{ id: 'oftheday', type: Model.UNBLOCK_RACE }`, `expiresAt` = +1 day (+2 if
  `isTomorrow`). Copy the date derivation from
  `src/sudoku/repository/sudoku.repository.ts:17-27`.
- `repository/unblock-race-collection.repository.ts` — id `ofthemonth-YYYYMM`,
  copying `sudoku-book.repository.ts:16-23` including the `setDate(1)` expiry.
- `unblock-race.service.ts` — find-or-generate for both, same shape as
  `SudokuService`. Constructs the reader once per generation and reuses it
  across all picks so the block cache is effective. **No scrambling** — Rush
  Hour boards are not isomorphic under the sudoku transforms, and the dataset is
  large enough that repeats are not a concern.
- `unblock-race.controller.ts` — `@Controller('unblockRace')`,
  `GET ofTheDay?isTomorrow=` and `GET collectionOfTheMonth?isNextMonth=`, both
  `@ApiKey()`, `ParseBoolPipe({ optional: true })`. No `difficulty` query param
  on `ofTheDay` and therefore no `validateDifficulty` call.
- `unblock-race.module.ts` — controllers + 2 repositories + service, no imports.

### 6. Wiring

- `src/types/enums/model.ts` — add `UNBLOCK_RACE = 'unblock-race'` and
  `UNBLOCK_RACE_COLLECTION = 'unblock-race-collection'`.
- `src/types/enums/difficulty.enum.ts` — add
  `UnblockRaceDifficulty { BEGINNER='beginner', CHALLENGING='challenging', HARD='hard', EXPERT='expert' }`.
- `src/app.module.ts` — add `UnblockRaceModule` to `imports` (line ~27).
- `ARCHITECTURE.md` — add the module to the feature-module list (line ~38).

### 7. Tests

Follow the sudoku patterns exactly — plain constructor injection with
`as never`, no `Test.createTestingModule`.

- Controller/service/entity/repository specs co-located, mirroring
  `sudoku.controller.spec.ts` / `sudoku.repository.spec.ts`. Use
  `jest.useFakeTimers().setSystemTime(...)` to assert exact ids
  (`oftheday-20240315`, `ofthemonth-202403`).
- Service spec mocks the reader and selection helpers via `jest.spyOn`.
- Integration (`test/integration/unblockrace/`) — real DynamoDB Local via
  `createIntegrationModule`, asserting id regexes.
- E2E (`test/e2e/unblockrace/`) — full app over HTTP with Basic auth; stub the
  S3 fetcher via `moduleNameMapper` so no network access is needed.

## Verification

1. `npm run build:nest` — compiles.
2. `npm test` — unit suites pass and coverage thresholds (95% statements /
   functions / lines, 85% branches) hold for the new utils and module.
3. `npm run dynamodb:start`, then `npm run test:integration` and
   `npm run test:e2e` — this task touches persistence and app wiring, so both
   are required per CLAUDE.md.
4. `npm run lint`.
5. Manual sanity check with a local `RangeFetcher` reading `rush-seeds/rush.bin`
   off disk (now that the file is committed, this needs no AWS access — the
   fetcher interface makes an fd-backed implementation a few lines):
   assert `selectDailyPuzzles` returns 5 boards whose `moves` are
   non-decreasing and whose bands are exactly
   `[beginner, challenging, challenging, hard, expert]`, and that
   `selectCollectionPuzzles` returns 50 with the per-band split 10/10/20/10.
   Cross-check a few boards against the matching line in `rush.txt`.
6. After deploy, confirm the first `ofTheDay` call of the day succeeds within
   the 15s Lambda timeout (measured ~40ms of reads locally; S3 latency dominates
   but is well within budget) and that the second call is served from DynamoDB.

## Notes / risks

- **`rush.bin` (19MB) is committed; `rush.txt` (115MB) is not.** `rush.txt` was
  only used during planning to derive the index tables and must stay out of the
  repo — add it to `.gitignore` if it ever lands in the tree. Committing
  `rush.bin` roughly triples repo size and is irreversible in history; this was
  a deliberate choice for reproducibility and full puzzle variety.
- **The S3 object is not created by CDK.** A fresh environment needs
  `npm run seeds:sync` after the first `cdk:deploy`, or `ofTheDay` will fail on
  its first cache miss. Worth a note in the deploy README.
- The 15s API Lambda timeout is the binding constraint on a cold monthly
  generation (~30 ranged GETs). Measured decompression is ~230ms total; S3
  round trips should add well under a second, but if it ever proves tight the
  block cache means fetching whole bands in fewer, larger ranges is an easy
  optimisation.
- `zstdDecompressSync` is Node ≥23.8 / recent 22.x. The stack pins
  `NODEJS_24_X`, so this is safe, but it is a hard runtime requirement worth a
  code comment.
