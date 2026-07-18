import { InviteEntity } from './invite.entity';

describe('InviteEntity', () => {
  it('copies all fields from the invite payload', () => {
    const now = new Date();
    const entity = new InviteEntity({
      inviteId: 'i1',
      resourceId: 'party-p1',
      description: 'Join us',
      sessionId: 'sudoku-s1',
      redirectUri: 'https://example.com',
      createdBy: 'user1',
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
    });
    expect(entity.inviteId).toBe('i1');
    expect(entity.resourceId).toBe('party-p1');
    expect(entity.description).toBe('Join us');
    expect(entity.sessionId).toBe('sudoku-s1');
    expect(entity.redirectUri).toBe('https://example.com');
    expect(entity.createdBy).toBe('user1');
    expect(entity.expiresAt).toBe(now);
  });
});
