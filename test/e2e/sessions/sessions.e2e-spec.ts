/**
 * E2E tests for the sessions routes, driving the full Nest app over HTTP
 * against local DynamoDB.
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
  fetchAppConfig: jest.fn(
    async () => require('../setup/mocks').STATIC_APP_CONFIG,
  ),
}));
jest.mock('@/revenuecat/revenuecat.service', () => ({
  RevenuecatService: require('../setup/mocks').RevenuecatServiceStub,
}));

import type { Response } from 'supertest';
const request = require('supertest');
import { startE2E, stopE2E, bearer, clearTable } from '../setup/harness';

jest.setTimeout(60000);

describe('Sessions (e2e)', () => {
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

  it('creates/updates a session then reads it back', async () => {
    const auth = bearer({ sub: 'sess-user' });
    const sessionId = 'sudoku-e2e-1';

    await request(server)
      .patch(`/sessions/${sessionId}`)
      .set('Authorization', auth)
      .send({ state: { progress: 42 } })
      .expect(200)
      .expect((res: Response) => {
        expect(res.body.sessionId).toBe(sessionId);
        expect(res.body.state).toEqual({ progress: 42 });
      });

    await request(server)
      .get(`/sessions/${sessionId}`)
      .set('Authorization', auth)
      .expect(200)
      .expect((res: Response) =>
        expect(res.body.state).toEqual({ progress: 42 }),
      );

    await request(server)
      .get('/sessions?app=sudoku')
      .set('Authorization', auth)
      .expect(200)
      .expect((res: Response) => {
        expect(
          res.body.map((s: { sessionId: string }) => s.sessionId),
        ).toContain(sessionId);
      });
  });

  it('rejects a session update with no state', async () => {
    await request(server)
      .patch('/sessions/sudoku-e2e-2')
      .set('Authorization', bearer())
      .send({})
      .expect(400);
  });
});
