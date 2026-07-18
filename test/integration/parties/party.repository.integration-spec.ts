/**
 * Integration tests for PartyRepository against a local DynamoDB instance.
 *
 * Prerequisites:
 *   - Local DynamoDB running at http://localhost:8000
 *     e.g. `npm run dynamodb:start` or
 *          `docker run -p 8000:8000 amazon/dynamodb-local`
 *
 * Run with: npm run test:integration
 */
import { TestingModule } from '@nestjs/testing';
import { PartyRepository } from '@/parties/repository/party.repository';
import { App } from '@/types/enums/app.enum';
import { setupDynamoDB, teardownDynamoDB, clearTable } from '../setup/dynamodb';
import { createIntegrationModule } from '../setup/testModule';

jest.setTimeout(60000);

describe('PartyRepository (integration)', () => {
  let moduleRef: TestingModule;
  let partyRepository: PartyRepository;

  beforeAll(async () => {
    await setupDynamoDB();
    moduleRef = await createIntegrationModule([PartyRepository]);
    partyRepository = moduleRef.get(PartyRepository);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await teardownDynamoDB();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it('inserts and reads back a party by model id', async () => {
    const party = await partyRepository.insert({
      appId: App.SUDOKU,
      partyName: 'Integration Party',
      createdBy: 'user1',
      maxSize: 5,
    } as never);

    expect(party.partyId).toMatch(/^sudoku-/);
    expect(party.createdAt).toBeInstanceOf(Date);

    const found = await partyRepository.find(party.partyId);
    expect(found).toBeDefined();
    expect(found?.partyName).toBe('Integration Party');
    expect(found?.maxSize).toBe(5);
  });

  it('finds a party by id and owner', async () => {
    const party = await partyRepository.insert({
      appId: App.SUDOKU,
      partyName: 'Owned Party',
      createdBy: 'user1',
      maxSize: 5,
    } as never);

    const found = await partyRepository.find(party.partyId, 'user1');
    expect(found?.partyName).toBe('Owned Party');

    const notFound = await partyRepository.find(
      party.partyId,
      'other-user',
      true,
    );
    expect(notFound).toBeUndefined();
  });

  it('lists parties owned by a user via the ownerIndex GSI, newest first', async () => {
    const first = await partyRepository.insert({
      appId: App.SUDOKU,
      partyName: 'First',
      createdBy: 'owner-1',
      maxSize: 5,
    } as never);
    // Ensure distinct createdAt ordering
    await new Promise((r) => setTimeout(r, 1100));
    const second = await partyRepository.insert({
      appId: App.SUDOKU,
      partyName: 'Second',
      createdBy: 'owner-1',
      maxSize: 5,
    } as never);

    const owned = await partyRepository.findAllOwnedByUser(
      'owner-1',
      App.SUDOKU,
    );
    expect(owned.map((p) => p.partyName)).toEqual(['Second', 'First']);
    expect(owned.map((p) => p.partyId)).toEqual([
      second.partyId,
      first.partyId,
    ]);
  });

  it('updates an existing party', async () => {
    const party = await partyRepository.insert({
      appId: App.SUDOKU,
      partyName: 'Before',
      createdBy: 'user1',
      maxSize: 5,
    } as never);

    const updated = await partyRepository.update(party.partyId, {
      appId: App.SUDOKU,
      partyName: 'After',
      createdBy: 'user1',
      maxSize: 8,
    } as never);
    expect(updated.partyName).toBe('After');
    expect(updated.maxSize).toBe(8);

    const found = await partyRepository.find(party.partyId, 'user1');
    expect(found?.partyName).toBe('After');
  });

  it('destroys a party', async () => {
    const party = await partyRepository.insert({
      appId: App.SUDOKU,
      partyName: 'Doomed',
      createdBy: 'user1',
      maxSize: 5,
    } as never);
    await partyRepository.destroy(party);
    const found = await partyRepository.find(party.partyId, 'user1', true);
    expect(found).toBeUndefined();
  });

  it('batch destroys many parties', async () => {
    const parties = [];
    for (let i = 0; i < 3; i++) {
      parties.push(
        await partyRepository.insert({
          appId: App.SUDOKU,
          partyName: `Batch ${i}`,
          createdBy: 'batch-user',
          maxSize: 5,
        } as never),
      );
    }
    await partyRepository.batchDestroy(parties);
    const remaining = await partyRepository.findAllOwnedByUser('batch-user');
    expect(remaining).toHaveLength(0);
  });
});
