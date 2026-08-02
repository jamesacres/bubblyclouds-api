import { PartyEntity } from './party.entity';
import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';

const base = {
  partyId: 'sudoku-p1',
  appId: 'sudoku',
  partyName: 'My Party',
  createdBy: 'user1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

describe('PartyEntity', () => {
  it('applies the default max size when none is provided', () => {
    const entity = new PartyEntity({ ...base, maxSize: undefined });
    expect(entity.maxSize).toBe(5);
  });

  it('keeps a provided max size and entitlement duration', () => {
    const entity = new PartyEntity({
      ...base,
      maxSize: 10,
      entitlementDuration: EntitlementDuration.LIFETIME,
    });
    expect(entity.maxSize).toBe(10);
    expect(entity.entitlementDuration).toBe(EntitlementDuration.LIFETIME);
  });

  it('findMembers delegates to the member repository with the party resource id', async () => {
    const members = [{ userId: 'u' }];
    const memberRepository = {
      findAllMembersForResource: jest.fn().mockResolvedValue(members),
    };
    const entity = new PartyEntity(base);
    const result = await entity.findMembers(memberRepository as never);
    expect(memberRepository.findAllMembersForResource).toHaveBeenCalledWith(
      'party-sudoku-p1',
    );
    expect(result).toBe(members);
  });
});
