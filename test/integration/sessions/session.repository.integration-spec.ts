/**
 * Integration tests for SessionRepository against a local DynamoDB instance.
 *
 * Prerequisites:
 *   - Local DynamoDB running at http://localhost:8000
 *     e.g. `npm run dynamodb:start` or
 *          `docker run -p 8000:8000 amazon/dynamodb-local`
 *
 * Run with: npm run test:integration
 */
import { TestingModule } from '@nestjs/testing';
import { SessionRepository } from '@/sessions/repository/session.repository';
import { App } from '@/types/enums/app.enum';
import { setupDynamoDB, teardownDynamoDB, clearTable } from '../setup/dynamodb';
import { createIntegrationModule } from '../setup/testModule';

jest.setTimeout(60000);

describe('SessionRepository (integration)', () => {
  let moduleRef: TestingModule;
  let sessionRepository: SessionRepository;

  beforeAll(async () => {
    await setupDynamoDB();
    moduleRef = await createIntegrationModule([SessionRepository]);
    sessionRepository = moduleRef.get(SessionRepository);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await teardownDynamoDB();
  });

  beforeEach(async () => {
    await clearTable();
  });

  it('upserts a session and reads it back', async () => {
    const session = await sessionRepository.upsert(
      'sudoku-sess-1',
      'session-user',
      { state: { board: [1, 2, 3] } } as never,
    );
    expect(session.sessionId).toBe('sudoku-sess-1');

    const found = await sessionRepository.find('sudoku-sess-1', 'session-user');
    expect(found?.state).toEqual({ board: [1, 2, 3] });
  });

  it('lists sessions for a user filtered by app, newest first', async () => {
    await sessionRepository.upsert('sudoku-a', 'list-user', {
      state: {},
    } as never);
    await new Promise((r) => setTimeout(r, 1100));
    await sessionRepository.upsert('sudoku-b', 'list-user', {
      state: {},
    } as never);

    const sessions = await sessionRepository.findAllForUser(
      'list-user',
      App.SUDOKU,
    );
    expect(sessions.map((s) => s.sessionId)).toEqual(['sudoku-b', 'sudoku-a']);
  });

  it('batch destroys sessions', async () => {
    const s1 = await sessionRepository.upsert('sudoku-d1', 'del-user', {
      state: {},
    } as never);
    const s2 = await sessionRepository.upsert('sudoku-d2', 'del-user', {
      state: {},
    } as never);
    await sessionRepository.batchDestroy([s1, s2]);
    const remaining = await sessionRepository.findAllForUser('del-user');
    expect(remaining).toHaveLength(0);
  });
});
