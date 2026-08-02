/**
 * E2E tests for the unblock race routes, driving the full Nest app over HTTP
 * against local DynamoDB.
 *
 * Like sudoku, these routes authenticate with an API key (HTTP Basic auth)
 * rather than a JWT bearer token, so this suite supplies its own AppConfig
 * containing a test API key.
 *
 * The S3 range fetcher is swapped for a file-backed one via moduleNameMapper
 * (see test/jest-e2e.json and test/mocks/unblock-race-s3-fetcher.ts), so puzzles are
 * read from the committed unblock-race/puzzles.bin with no network access.
 *
 * Prerequisites:
 *   - Local DynamoDB running at http://localhost:8000 (`npm run dynamodb:start`)
 *
 * Run with: npm run test:e2e
 */
// jest hoists jest.mock above imports, so the factories lazily require their
// helpers (which run after modules initialise). See test/e2e/setup/mocks.ts.
jest.mock('@/utils/fetchPublicKey', () => ({
  fetchPublicKey: jest.fn(
    async () => require('../setup/auth').TEST_PUBLIC_KEY_PEM,
  ),
}));
jest.mock('@/utils/fetchAppConfig', () => ({
  fetchAppConfig: jest.fn(async () => ({
    apiKeys: { 'e2e-unblockrace': { password: 'unblockrace-secret' } },
  })),
}));
jest.mock('@/revenuecat/revenuecat.service', () => ({
  RevenuecatService: require('../setup/mocks').RevenuecatServiceStub,
}));

import type { Response } from 'supertest';
const request = require('supertest');
import { clearTable, startE2E, stopE2E } from '../setup/harness';

jest.setTimeout(120000);

const API_KEY_AUTH = `Basic ${Buffer.from(
  'e2e-unblockrace:unblockrace-secret',
).toString('base64')}`;

const EXPECTED_DAILY_DIFFICULTIES = [
  'beginner',
  'challenging',
  'challenging',
  'hard',
  'expert',
];

describe('Unblock race (e2e)', () => {
  let server: import('http').Server;

  beforeAll(async () => {
    process.env.STATIC_BUCKET = 'e2e-bucket';
    server = await startE2E();
  });

  afterAll(async () => {
    await stopE2E();
    delete process.env.STATIC_BUCKET;
  });

  beforeEach(async () => {
    await clearTable();
  });

  it('rejects a request with no API key', async () => {
    await request(server).get('/unblockRace/ofTheDay').expect(401);
  });

  it('rejects a request with a wrong API key', async () => {
    await request(server)
      .get('/unblockRace/ofTheDay')
      .set(
        'Authorization',
        `Basic ${Buffer.from('e2e-unblockrace:wrong').toString('base64')}`,
      )
      .expect(401);
  });

  it('returns five puzzles of increasing difficulty in a single record', async () => {
    await request(server)
      .get('/unblockRace/ofTheDay')
      .set('Authorization', API_KEY_AUTH)
      .expect(200)
      .expect((res: Response) => {
        expect(res.body.unblockRaceId).toContain('oftheday-');
        expect(res.body.puzzles).toHaveLength(5);

        expect(
          res.body.puzzles.map((p: { difficulty: string }) => p.difficulty),
        ).toEqual(EXPECTED_DAILY_DIFFICULTIES);

        // Boards are real 6x6 grids containing the escaping car.
        for (const puzzle of res.body.puzzles) {
          expect(puzzle.board).toHaveLength(36);
          expect(puzzle.board).toContain('A');
          expect(puzzle.moves).toBeGreaterThan(0);
        }

        const moves = res.body.puzzles.map((p: { moves: number }) => p.moves);
        expect([...moves].sort((a: number, b: number) => a - b)).toEqual(moves);
      });
  });

  it('serves the same puzzles on a repeat call', async () => {
    const first = await request(server)
      .get('/unblockRace/ofTheDay')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    const second = await request(server)
      .get('/unblockRace/ofTheDay')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    expect(second.body.unblockRaceId).toBe(first.body.unblockRaceId);
    expect(second.body.puzzles).toEqual(first.body.puzzles);
  });

  it('supports the isTomorrow flag with a distinct record id', async () => {
    const today = await request(server)
      .get('/unblockRace/ofTheDay')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    const tomorrow = await request(server)
      .get('/unblockRace/ofTheDay?isTomorrow=true')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    expect(tomorrow.body.unblockRaceId).not.toBe(today.body.unblockRaceId);
  });

  it('generates a 50 puzzle collection on a bell curve', async () => {
    const collection = await request(server)
      .get('/unblockRace/collectionOfTheMonth')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    expect(collection.body.unblockRaceCollectionId).toContain('ofthemonth-');
    expect(collection.body.puzzles).toHaveLength(50);

    const byDifficulty: Record<string, number> = {};
    for (const puzzle of collection.body.puzzles) {
      byDifficulty[puzzle.difficulty] =
        (byDifficulty[puzzle.difficulty] ?? 0) + 1;
    }
    expect(byDifficulty).toEqual({
      beginner: 10,
      challenging: 10,
      hard: 20,
      expert: 10,
    });

    // Repeat call returns the same stored collection.
    const again = await request(server)
      .get('/unblockRace/collectionOfTheMonth')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);
    expect(again.body.unblockRaceCollectionId).toBe(
      collection.body.unblockRaceCollectionId,
    );
  });

  it('supports the isNextMonth flag with a distinct record id', async () => {
    const thisMonth = await request(server)
      .get('/unblockRace/collectionOfTheMonth')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    const nextMonth = await request(server)
      .get('/unblockRace/collectionOfTheMonth?isNextMonth=true')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    expect(nextMonth.body.unblockRaceCollectionId).not.toBe(
      thisMonth.body.unblockRaceCollectionId,
    );
  });
});
