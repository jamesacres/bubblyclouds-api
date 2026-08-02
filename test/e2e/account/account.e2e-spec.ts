/**
 * E2E tests for the account route, driving the full Nest app over HTTP against
 * local DynamoDB.
 *
 * DELETE /account cascades across the caller's sessions, memberships, parties,
 * and — for owned parties — the other members and invites of those parties,
 * before calling the auth service to remove the user. The auth-service call is
 * stubbed here (global.fetch) so no external request is made.
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
import { startE2E, stopE2E, bearer, clearTable } from '../setup/harness';

jest.setTimeout(60000);

describe('Account (e2e)', () => {
  let server: import('http').Server;
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    server = await startE2E();
  });

  afterAll(async () => {
    await stopE2E();
  });

  beforeEach(async () => {
    await clearTable();
    // Stub the outbound auth-service call (AccountService.delete -> fetch).
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('rejects an unauthenticated request', async () => {
    await request(server).delete('/account').expect(401);
  });

  it('deletes the caller account and cascades their owned party', async () => {
    const userId = 'account-owner';
    const auth = bearer({ sub: userId });

    // Seed a party owned by the user (also creates their owning membership).
    const party = await request(server)
      .post('/parties')
      .set('Authorization', auth)
      .send({ appId: 'sudoku', partyName: 'ToDelete', memberNickname: 'Owner' })
      .expect(201);
    const partyId = party.body.partyId;

    // Seed a session for the user.
    await request(server)
      .patch('/sessions/sudoku-account-1')
      .set('Authorization', auth)
      .send({ state: { progress: 1 } })
      .expect(200);

    // Sanity: the party is listed before deletion.
    const before = await request(server)
      .get('/parties?app=sudoku')
      .set('Authorization', auth)
      .expect(200);
    expect(before.body.map((p: { partyId: string }) => p.partyId)).toContain(
      partyId,
    );

    // Delete the account.
    await request(server)
      .delete('/account')
      .set('Authorization', auth)
      .expect(204);

    // The auth service was called with the encoded userId.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchSpy.mock.calls[0][0]);
    expect(calledUrl).toContain(
      `/api/account/${encodeURIComponent(userId)}/delete`,
    );

    // The owned party no longer appears for the user.
    const after = await request(server)
      .get('/parties?app=sudoku')
      .set('Authorization', auth)
      .expect(200);
    expect(after.body.map((p: { partyId: string }) => p.partyId)).not.toContain(
      partyId,
    );

    // The user's session is gone too.
    await request(server)
      .get('/sessions/sudoku-account-1')
      .set('Authorization', auth)
      .expect(404);
  });

  it('still returns 204 when the caller has no data', async () => {
    const auth = bearer({ sub: 'account-empty' });
    await request(server)
      .delete('/account')
      .set('Authorization', auth)
      .expect(204);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
