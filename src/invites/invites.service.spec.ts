import { NotFoundException } from '@nestjs/common';
import { InvitesService } from './invites.service';

describe('InvitesService', () => {
  let inviteRepository: { insert: jest.Mock; find: jest.Mock };
  let partyRepository: { find: jest.Mock };
  let memberRepository: { findAllMembersForResource: jest.Mock };
  let service: InvitesService;

  beforeEach(() => {
    inviteRepository = { insert: jest.fn(), find: jest.fn() };
    partyRepository = { find: jest.fn() };
    memberRepository = { findAllMembersForResource: jest.fn() };
    service = new InvitesService(
      inviteRepository as never,
      partyRepository as never,
      memberRepository as never,
    );
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('create', () => {
    it('creates an invite when the party exists and has space', async () => {
      partyRepository.find.mockResolvedValue({ maxSize: 5 });
      memberRepository.findAllMembersForResource.mockResolvedValue([
        { userId: 'user1' },
      ]);
      inviteRepository.insert.mockResolvedValue({ inviteId: 'i1' });

      const result = await service.create(
        {
          resourceId: 'party-p1',
          description: 'd',
          sessionId: 's',
          redirectUri: 'r',
        } as never,
        'user1',
      );
      expect(inviteRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ resourceId: 'party-p1', createdBy: 'user1' }),
      );
      expect(result).toEqual({ inviteId: 'i1' });
    });

    it('throws when the party is not found', async () => {
      partyRepository.find.mockResolvedValue(undefined);
      await expect(
        service.create({ resourceId: 'party-p1' } as never, 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the party is full and the creator is not already a member', async () => {
      partyRepository.find.mockResolvedValue({ maxSize: 1 });
      memberRepository.findAllMembersForResource.mockResolvedValue([
        { userId: 'someone-else' },
      ]);
      await expect(
        service.create({ resourceId: 'party-p1' } as never, 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the resource type is not a party', async () => {
      await expect(
        service.create({ resourceId: 'session-s1' } as never, 'user1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPublicInvite', () => {
    it('returns public invite details when the invite and resource exist', async () => {
      inviteRepository.find.mockResolvedValue({
        resourceId: 'party-p1',
        description: 'd',
        sessionId: 's',
        redirectUri: 'r',
      });
      partyRepository.find.mockResolvedValue({
        maxSize: 5,
        entitlementDuration: 'one_month',
      });
      memberRepository.findAllMembersForResource.mockResolvedValue([]);

      const result = await service.findPublicInvite('i1', 'user1');
      expect(result).toEqual({
        resourceId: 'party-p1',
        description: 'd',
        sessionId: 's',
        redirectUri: 'r',
        entitlementDuration: 'one_month',
      });
    });

    it('throws when the invite is not found', async () => {
      inviteRepository.find.mockResolvedValue(undefined);
      await expect(service.findPublicInvite('i1', 'user1')).rejects.toThrow(
        'Invite not found',
      );
    });

    it('throws when the resource no longer exists', async () => {
      inviteRepository.find.mockResolvedValue({ resourceId: 'party-p1' });
      partyRepository.find.mockResolvedValue(undefined);
      await expect(service.findPublicInvite('i1', 'user1')).rejects.toThrow(
        'Resource not found',
      );
    });

    it('allows an existing member to view an invite even when the party is full', async () => {
      inviteRepository.find.mockResolvedValue({ resourceId: 'party-p1' });
      partyRepository.find.mockResolvedValue({ maxSize: 1 });
      memberRepository.findAllMembersForResource.mockResolvedValue([
        { userId: 'user1' },
      ]);
      const result = await service.findPublicInvite('i1', 'user1');
      expect(result.resourceId).toBe('party-p1');
    });
  });
});
