import { SessionEntity } from './session.entity';

describe('SessionEntity', () => {
  it('copies all fields from the session payload', () => {
    const now = new Date();
    const entity = new SessionEntity({
      sessionId: 'sudoku-s1',
      userId: 'user1',
      state: { foo: 'bar' },
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
    });
    expect(entity.sessionId).toBe('sudoku-s1');
    expect(entity.userId).toBe('user1');
    expect(entity.state).toEqual({ foo: 'bar' });
    expect(entity.expiresAt).toBe(now);
  });
});
