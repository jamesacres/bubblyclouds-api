/**
 * E2E tests for the invite + member-join flow, driving the full Nest app over
 * HTTP against local DynamoDB.
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

describe('Invites + members (e2e)', () => {
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

  it('lets an owner invite and another user join the party', async () => {
    const ownerAuth = bearer({ sub: 'owner-1' });
    const joinerAuth = bearer({ sub: 'joiner-1' });

    const party = await request(server)
      .post('/parties')
      .set('Authorization', ownerAuth)
      .send({ appId: 'sudoku', partyName: 'Joinable', memberNickname: 'Owner' })
      .expect(201);
    const resourceId = `party-${party.body.partyId}`;

    const invite = await request(server)
      .post('/invites')
      .set('Authorization', ownerAuth)
      .send({ resourceId })
      .expect(201);
    const inviteId = invite.body.inviteId;
    expect(inviteId).toBeDefined();

    // Public invite lookup (joiner)
    await request(server)
      .get(`/invites/${inviteId}`)
      .set('Authorization', joinerAuth)
      .expect(200)
      .expect((res: Response) => expect(res.body.resourceId).toBe(resourceId));

    // Joiner joins as a member
    await request(server)
      .post('/members')
      .set('Authorization', joinerAuth)
      .send({ inviteId, memberNickname: 'Joiner' })
      .expect(201)
      .expect((res: Response) => expect(res.body.userId).toBe('joiner-1'));

    // Members list now contains both owner and joiner
    const members = await request(server)
      .get(`/members?resourceId=${resourceId}`)
      .set('Authorization', ownerAuth)
      .expect(200);
    const userIds = members.body.map((m: { userId: string }) => m.userId);
    expect(userIds).toEqual(expect.arrayContaining(['owner-1', 'joiner-1']));
  });
});
