/**
 * E2E tests for the members routes, driving the full Nest app over HTTP against
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

describe('Members (e2e)', () => {
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

  /**
   * Creates a party (owner becomes the first member) and returns the
   * resourceId plus an invite the joiner can redeem.
   */
  const seedPartyWithInvite = async (
    ownerAuth: string,
  ): Promise<{ resourceId: string; inviteId: string }> => {
    const party = await request(server)
      .post('/parties')
      .set('Authorization', ownerAuth)
      .send({
        appId: 'sudoku',
        partyName: 'Members Party',
        memberNickname: 'Owner',
      })
      .expect(201);
    const resourceId = `party-${party.body.partyId}`;

    const invite = await request(server)
      .post('/invites')
      .set('Authorization', ownerAuth)
      .send({ resourceId })
      .expect(201);

    return { resourceId, inviteId: invite.body.inviteId };
  };

  it('requires members.write scope', async () => {
    await request(server)
      .get('/members?resourceId=party-sudoku-anything')
      .set('Authorization', bearer({ scope: 'parties.write' }))
      .expect(401);
  });

  it('rejects an unauthenticated request', async () => {
    await request(server)
      .get('/members?resourceId=party-sudoku-anything')
      .expect(401);
  });

  it('validates the create body (missing inviteId/nickname)', async () => {
    await request(server)
      .post('/members')
      .set('Authorization', bearer())
      .send({ memberNickname: 'NoInvite' })
      .expect(400);
  });

  it('creates a member via invite, lists members, then deletes the member', async () => {
    const ownerAuth = bearer({ sub: 'members-owner' });
    const joinerAuth = bearer({ sub: 'members-joiner' });
    const { resourceId, inviteId } = await seedPartyWithInvite(ownerAuth);

    // Joiner redeems the invite to become a member.
    await request(server)
      .post('/members')
      .set('Authorization', joinerAuth)
      .send({ inviteId, memberNickname: 'Joiner' })
      .expect(201)
      .expect((res: Response) => {
        expect(res.body.userId).toBe('members-joiner');
        expect(res.body.resourceId).toBe(resourceId);
      });

    // Owner lists members: both owner and joiner present.
    const list = await request(server)
      .get(`/members?resourceId=${resourceId}`)
      .set('Authorization', ownerAuth)
      .expect(200);
    const userIds = list.body.map((m: { userId: string }) => m.userId);
    expect(userIds).toEqual(
      expect.arrayContaining(['members-owner', 'members-joiner']),
    );

    // Owner removes the joiner.
    await request(server)
      .delete(`/members/members-joiner?resourceId=${resourceId}`)
      .set('Authorization', ownerAuth)
      .expect(204);

    // Joiner is gone; owner remains.
    const listAfter = await request(server)
      .get(`/members?resourceId=${resourceId}`)
      .set('Authorization', ownerAuth)
      .expect(200);
    const userIdsAfter = listAfter.body.map(
      (m: { userId: string }) => m.userId,
    );
    expect(userIdsAfter).toContain('members-owner');
    expect(userIdsAfter).not.toContain('members-joiner');
  });
});
