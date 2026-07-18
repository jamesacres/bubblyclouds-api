/**
 * Integration tests for InviteRepository against a local DynamoDB instance.
 *
 * Prerequisites:
 *   - Local DynamoDB running at http://localhost:8000
 *     e.g. `npm run dynamodb:start` or
 *          `docker run -p 8000:8000 amazon/dynamodb-local`
 *
 * Run with: npm run test:integration
 */
import { TestingModule } from '@nestjs/testing';
import { InviteRepository } from '@/invites/repository/invite.repository';
import { Model } from '@/types/enums/model';
import { setupDynamoDB, teardownDynamoDB, clearTable } from '../setup/dynamodb';
import { createIntegrationModule } from '../setup/testModule';

jest.setTimeout(60000);

describe('InviteRepository (integration)', () => {
  let moduleRef: TestingModule;
  let inviteRepository: InviteRepository;

  beforeAll(async () => {
    await setupDynamoDB();
    moduleRef = await createIntegrationModule([InviteRepository]);
    inviteRepository = moduleRef.get(InviteRepository);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await teardownDynamoDB();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it('inserts and finds an invite by id', async () => {
    const invite = await inviteRepository.insert({
      resourceId: `${Model.PARTY}-invite-p`,
      createdBy: 'inviter',
      description: 'Come join',
    } as never);

    const found = await inviteRepository.find(invite.inviteId);
    expect(found?.description).toBe('Come join');
    expect(found?.resourceId).toBe(`${Model.PARTY}-invite-p`);
  });

  it('lists invites for a resource, oldest first', async () => {
    await inviteRepository.insert({
      resourceId: `${Model.PARTY}-invite-list`,
      createdBy: 'inviter',
      description: 'First',
    } as never);
    await new Promise((r) => setTimeout(r, 1100));
    await inviteRepository.insert({
      resourceId: `${Model.PARTY}-invite-list`,
      createdBy: 'inviter',
      description: 'Second',
    } as never);

    const invites = await inviteRepository.findAllInvitesForResource(
      `${Model.PARTY}-invite-list`,
    );
    expect(invites.map((i) => i.description)).toEqual(['First', 'Second']);
  });

  it('honours a future expiry (record still returned before expiry)', async () => {
    const invite = await inviteRepository.insert({
      resourceId: `${Model.PARTY}-invite-exp`,
      createdBy: 'inviter',
      description: 'Expiring',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    } as never);
    const found = await inviteRepository.find(invite.inviteId);
    expect(found).toBeDefined();
  });

  it('treats an already-expired record as not found', async () => {
    const invite = await inviteRepository.insert({
      resourceId: `${Model.PARTY}-invite-old`,
      createdBy: 'inviter',
      description: 'Old',
      // expiresAt in the past — adapter filters it out even before TTL sweep
      expiresAt: new Date(Date.now() - 60 * 1000),
    } as never);
    const found = await inviteRepository.find(invite.inviteId);
    expect(found).toBeUndefined();
  });
});
