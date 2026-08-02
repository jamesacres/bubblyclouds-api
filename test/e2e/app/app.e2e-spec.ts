/**
 * E2E tests for the app-level routes (public health/redirect) and the global
 * AuthGuard behaviour, driving the full Nest app over HTTP against local
 * DynamoDB.
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

const request = require('supertest');
import { startE2E, stopE2E, bearer } from '../setup/harness';

jest.setTimeout(60000);

describe('App routes (e2e)', () => {
  let server: import('http').Server;

  beforeAll(async () => {
    server = await startE2E();
  });

  afterAll(async () => {
    await stopE2E();
  });

  describe('public routes', () => {
    it('GET /health returns ok without auth', async () => {
      await request(server).get('/health').expect(200).expect({ ok: true });
    });

    it('GET / redirects to the marketing site', async () => {
      await request(server).get('/').expect(301);
    });
  });

  describe('authentication', () => {
    it('rejects requests to protected routes without a token', async () => {
      await request(server).get('/parties?app=sudoku').expect(401);
    });

    it('rejects a token missing the required scope', async () => {
      await request(server)
        .get('/parties?app=sudoku')
        .set('Authorization', bearer({ scope: 'sessions.write' }))
        .expect(401);
    });

    it('rejects a garbage bearer token', async () => {
      await request(server)
        .get('/parties?app=sudoku')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);
    });
  });
});
