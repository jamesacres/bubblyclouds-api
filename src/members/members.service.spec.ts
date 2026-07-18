import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { Model } from '@/types/enums/model';
import { Entitlement } from '@/types/enums/entitlement.enum';
import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';

describe('MembersService', () => {
  let inviteService: { findPublicInvite: jest.Mock };
  let memberRepository: {
    insert: jest.Mock;
    findAllMembersForResource: jest.Mock;
    findForUser: jest.Mock;
    destroy: jest.Mock;
  };
  let partyRepository: { find: jest.Mock };
  let revenuecatService: {
    hasEntitlement: jest.Mock;
    grantEntitlement: jest.Mock;
  };
  let service: MembersService;

  beforeEach(() => {
    inviteService = { findPublicInvite: jest.fn() };
    memberRepository = {
      insert: jest.fn(),
      findAllMembersForResource: jest.fn(),
      findForUser: jest.fn(),
      destroy: jest.fn(),
    };
    partyRepository = { find: jest.fn() };
    revenuecatService = {
      hasEntitlement: jest.fn(),
      grantEntitlement: jest.fn().mockResolvedValue(undefined),
    };
    service = new MembersService(
      inviteService as never,
      memberRepository as never,
      partyRepository as never,
      revenuecatService as never,
    );
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('create', () => {
    it('joins the resource via the invite with no entitlement', async () => {
      inviteService.findPublicInvite.mockResolvedValue({
        resourceId: 'party-p1',
      });
      memberRepository.insert.mockResolvedValue({ userId: 'user1' });
      const result = await service.create(
        { inviteId: 'i1', memberNickname: 'Nick' },
        'user1',
      );
      expect(memberRepository.insert).toHaveBeenCalledWith({
        userId: 'user1',
        memberNickname: 'Nick',
        resourceId: 'party-p1',
      });
      expect(result).toEqual({ userId: 'user1' });
      expect(revenuecatService.grantEntitlement).not.toHaveBeenCalled();
    });

    it('grants an entitlement when the invite carries one and the user lacks Plus', async () => {
      inviteService.findPublicInvite.mockResolvedValue({
        resourceId: 'party-p1',
        entitlementDuration: EntitlementDuration.ONE_MONTH,
      });
      memberRepository.insert.mockResolvedValue({ userId: 'user1' });
      revenuecatService.hasEntitlement.mockResolvedValue(false);

      await service.create({ inviteId: 'i1', memberNickname: 'N' }, 'user1');
      expect(revenuecatService.grantEntitlement).toHaveBeenCalledWith(
        'user1',
        Entitlement.PLUS,
        EntitlementDuration.ONE_MONTH,
      );
    });

    it('does not grant when the user already has Plus', async () => {
      inviteService.findPublicInvite.mockResolvedValue({
        resourceId: 'party-p1',
        entitlementDuration: EntitlementDuration.ONE_MONTH,
      });
      memberRepository.insert.mockResolvedValue({ userId: 'user1' });
      revenuecatService.hasEntitlement.mockResolvedValue(true);

      await service.create({ inviteId: 'i1', memberNickname: 'N' }, 'user1');
      expect(revenuecatService.grantEntitlement).not.toHaveBeenCalled();
    });

    it('treats a revenuecat lookup failure as not having Plus', async () => {
      inviteService.findPublicInvite.mockResolvedValue({
        resourceId: 'party-p1',
        entitlementDuration: EntitlementDuration.ONE_YEAR,
      });
      memberRepository.insert.mockResolvedValue({ userId: 'user1' });
      revenuecatService.hasEntitlement.mockRejectedValue(new Error('down'));

      await service.create({ inviteId: 'i1', memberNickname: 'N' }, 'user1');
      expect(revenuecatService.grantEntitlement).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns members when the requester is a member', async () => {
      partyRepository.find.mockResolvedValue({ partyId: 'p1' });
      memberRepository.findAllMembersForResource.mockResolvedValue([
        { userId: 'user1' },
      ]);
      const result = await service.findAll('party-p1', 'user1');
      expect(result).toEqual([{ userId: 'user1' }]);
    });

    it('throws Forbidden when the resource does not exist', async () => {
      partyRepository.find.mockResolvedValue(undefined);
      await expect(service.findAll('party-p1', 'user1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFound when the requester is not a member', async () => {
      partyRepository.find.mockResolvedValue({ partyId: 'p1' });
      memberRepository.findAllMembersForResource.mockResolvedValue([
        { userId: 'someone' },
      ]);
      await expect(service.findAll('party-p1', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteForUser', () => {
    it('lets a user remove themselves', async () => {
      memberRepository.findForUser.mockResolvedValue({ userId: 'user1' });
      await service.deleteForUser('user1', 'party-p1', 'user1');
      expect(memberRepository.destroy).toHaveBeenCalledWith({
        userId: 'user1',
      });
      expect(partyRepository.find).not.toHaveBeenCalled();
    });

    it('lets a party owner remove another member', async () => {
      partyRepository.find.mockResolvedValue({ partyId: 'p1' });
      memberRepository.findForUser.mockResolvedValue({ userId: 'target' });
      await service.deleteForUser('owner', 'party-p1', 'target');
      expect(partyRepository.find).toHaveBeenCalledWith('p1', 'owner');
      expect(memberRepository.destroy).toHaveBeenCalled();
    });

    it('throws Forbidden when a non-owner tries to remove another member', async () => {
      partyRepository.find.mockResolvedValue(undefined);
      await expect(
        service.deleteForUser('user1', 'party-p1', 'target'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFound when the member to delete does not exist', async () => {
      memberRepository.findForUser.mockResolvedValue(undefined);
      await expect(
        service.deleteForUser('user1', 'party-p1', 'user1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('looks up the member with the resource owner type/id', async () => {
      memberRepository.findForUser.mockResolvedValue({ userId: 'user1' });
      await service.deleteForUser('user1', 'party-p1', 'user1');
      expect(memberRepository.findForUser).toHaveBeenCalledWith(
        'user1',
        Model.PARTY,
        'p1',
      );
    });
  });
});
