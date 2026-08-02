/**
 * E2E tests for the parties routes, driving the full Nest app over HTTP against
 * local DynamoDB.
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

describe('Parties (e2e)', () => {
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

  it('validates the request body', async () => {
    await request(server)
      .post('/parties')
      .set('Authorization', bearer())
      .send({ appId: 'sudoku' }) // missing partyName / memberNickname
      .expect(400);
  });

  it('rejects an invalid app', async () => {
    await request(server)
      .post('/parties')
      .set('Authorization', bearer())
      .send({ appId: 'nope', partyName: 'P', memberNickname: 'N' })
      .expect(400);
  });

  it('creates a party, lists it, updates and deletes it', async () => {
    const auth = bearer({ sub: 'e2e-owner' });

    const created = await request(server)
      .post('/parties')
      .set('Authorization', auth)
      .send({
        appId: 'sudoku',
        partyName: 'E2E Party',
        memberNickname: 'Owner',
      })
      .expect(201);
    const partyId = created.body.partyId;
    expect(partyId).toMatch(/^sudoku-/);
    expect(created.body.createdBy).toBe('e2e-owner');

    const list = await request(server)
      .get('/parties?app=sudoku')
      .set('Authorization', auth)
      .expect(200);
    expect(list.body.map((p: { partyId: string }) => p.partyId)).toContain(
      partyId,
    );

    await request(server)
      .patch(`/parties/${partyId}?app=sudoku`)
      .set('Authorization', auth)
      .send({ partyName: 'Renamed' })
      .expect(200)
      .expect((res: Response) => expect(res.body.partyName).toBe('Renamed'));

    await request(server)
      .delete(`/parties/${partyId}?app=sudoku`)
      .set('Authorization', auth)
      .expect(204);

    const listAfter = await request(server)
      .get('/parties?app=sudoku')
      .set('Authorization', auth)
      .expect(200);
    expect(
      listAfter.body.map((p: { partyId: string }) => p.partyId),
    ).not.toContain(partyId);
  });

  it('does not let a non-owner patch or delete a party', async () => {
    const owner = bearer({ sub: 'owner-x' });
    const stranger = bearer({ sub: 'stranger-x' });

    const created = await request(server)
      .post('/parties')
      .set('Authorization', owner)
      .send({ appId: 'sudoku', partyName: 'Guarded', memberNickname: 'Owner' })
      .expect(201);
    const partyId = created.body.partyId;

    await request(server)
      .patch(`/parties/${partyId}?app=sudoku`)
      .set('Authorization', stranger)
      .send({ partyName: 'Hijacked' })
      .expect(404);

    await request(server)
      .delete(`/parties/${partyId}?app=sudoku`)
      .set('Authorization', stranger)
      .expect(404);

    // Owner can still see the untouched party.
    const list = await request(server)
      .get('/parties?app=sudoku')
      .set('Authorization', owner)
      .expect(200);
    const found = list.body.find(
      (p: { partyId: string }) => p.partyId === partyId,
    );
    expect(found?.partyName).toBe('Guarded');
  });
});
