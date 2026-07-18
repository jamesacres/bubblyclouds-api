import { MemberEntity } from './member.entity';

const base = {
  userId: 'user1',
  resourceId: 'party-p1',
  memberNickname: 'Nick',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

describe('MemberEntity', () => {
  it('copies fields from the member payload', () => {
    const entity = new MemberEntity(base);
    expect(entity.userId).toBe('user1');
    expect(entity.resourceId).toBe('party-p1');
    expect(entity.memberNickname).toBe('Nick');
  });

  it('getSession delegates to the session repository for this member', async () => {
    const session = { sessionId: 'sudoku-s1' };
    const sessionRepository = {
      find: jest.fn().mockResolvedValue(session),
    };
    const entity = new MemberEntity(base);
    const result = await entity.getSession(
      'sudoku-s1',
      sessionRepository as never,
      true,
    );
    expect(sessionRepository.find).toHaveBeenCalledWith(
      'sudoku-s1',
      'user1',
      true,
    );
    expect(result).toBe(session);
  });
});
