/**
 * E2E tests for the sudoku routes, driving the full Nest app over HTTP against
 * local DynamoDB.
 *
 * These routes authenticate with an API key (HTTP Basic auth) rather than a JWT
 * bearer token (see @ApiKey() + src/guards/auth.guard.ts). This suite supplies
 * its own AppConfig containing a test API key, so it does NOT reuse the shared
 * STATIC_APP_CONFIG (which has no apiKeys).
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
    apiKeys: { 'e2e-sudoku': { password: 'sudoku-secret' } },
  })),
}));
jest.mock('@/revenuecat/revenuecat.service', () => ({
  RevenuecatService: require('../setup/mocks').RevenuecatServiceStub,
}));

import type { Response } from 'supertest';
const request = require('supertest');
import { startE2E, stopE2E, clearTable } from '../setup/harness';

jest.setTimeout(120000);

const API_KEY_AUTH = `Basic ${Buffer.from('e2e-sudoku:sudoku-secret').toString('base64')}`;

describe('Sudoku (e2e)', () => {
  let server: import('http').Server;

  beforeAll(async () => {
    server = await startE2E();
  });

  afterAll(async () => {
    await stopE2E();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it('rejects a request with no API key', async () => {
    await request(server).get('/sudoku/ofTheDay?difficulty=easy').expect(401);
  });

  it('rejects a request with a wrong API key', async () => {
    await request(server)
      .get('/sudoku/ofTheDay?difficulty=easy')
      .set(
        'Authorization',
        `Basic ${Buffer.from('e2e-sudoku:wrong').toString('base64')}`,
      )
      .expect(401);
  });

  it('rejects an invalid difficulty', async () => {
    await request(server)
      .get('/sudoku/ofTheDay?difficulty=nope')
      .set('Authorization', API_KEY_AUTH)
      .expect(400);
  });

  it('generates the sudoku of the day and returns the same puzzle on a repeat call', async () => {
    const first = await request(server)
      .get('/sudoku/ofTheDay?difficulty=easy')
      .set('Authorization', API_KEY_AUTH)
      .expect(200)
      .expect((res: Response) => {
        expect(res.body.difficulty).toBe('easy');
        expect(typeof res.body.initial).toBe('string');
        expect(typeof res.body.final).toBe('string');
        expect(res.body.sudokuId).toContain('oftheday-');
      });

    // Second call for the same difficulty/day should be served from storage.
    const second = await request(server)
      .get('/sudoku/ofTheDay?difficulty=easy')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);
    expect(second.body.sudokuId).toBe(first.body.sudokuId);
    expect(second.body.initial).toBe(first.body.initial);
  });

  it('supports the isTomorrow flag with a distinct puzzle id', async () => {
    const today = await request(server)
      .get('/sudoku/ofTheDay?difficulty=simple')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    const tomorrow = await request(server)
      .get('/sudoku/ofTheDay?difficulty=simple&isTomorrow=true')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);

    expect(tomorrow.body.sudokuId).not.toBe(today.body.sudokuId);
  });

  it('generates the sudoku book of the month', async () => {
    const book = await request(server)
      .get('/sudoku/bookOfTheMonth')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);
    expect(book.body.sudokuBookId).toContain('ofthemonth-');
    expect(Array.isArray(book.body.puzzles)).toBe(true);
    expect(book.body.puzzles.length).toBeGreaterThan(0);

    // Repeat call returns the same stored book.
    const again = await request(server)
      .get('/sudoku/bookOfTheMonth')
      .set('Authorization', API_KEY_AUTH)
      .expect(200);
    expect(again.body.sudokuBookId).toBe(book.body.sudokuBookId);
  });
});
