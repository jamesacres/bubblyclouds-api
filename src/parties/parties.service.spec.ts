import { NotFoundException } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { Model } from '@/types/enums/model';
import { App } from '@/types/enums/app.enum';
import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';
import { Entitlement } from '@/types/enums/entitlement.enum';

describe('PartiesService', () => {
  let partyRepository: {
    insert: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    destroy: jest.Mock;
  };
  let memberRepository: {
    insert: jest.Mock;
    findAllForUser: jest.Mock;
    findForUser: jest.Mock;
  };
  let revenuecatService: { hasEntitlement: jest.Mock };
  let configService: { get: jest.Mock };
  let service: PartiesService;

  beforeEach(() => {
    partyRepository = {
      insert: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
    };
    memberRepository = {
      insert: jest.fn(),
      findAllForUser: jest.fn(),
      findForUser: jest.fn(),
    };
    revenuecatService = { hasEntitlement: jest.fn() };
    configService = { get: jest.fn().mockReturnValue(undefined) };
    service = new PartiesService(
      partyRepository as never,
      memberRepository as never,
      revenuecatService as never,
      configService as never,
    );
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  describe('create', () => {
    it('creates a party and auto-joins the creator as a member', async () => {
      revenuecatService.hasEntitlement.mockResolvedValue(false);
      partyRepository.insert.mockResolvedValue({ partyId: 'sudoku-p1' });

      const result = await service.create(
        {
          appId: 'sudoku',
          partyName: 'Party',
          memberNickname: 'Nick',
          maxSize: 5,
        } as never,
        'user1',
      );

      expect(partyRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          appId: 'sudoku',
          partyName: 'Party',
          createdBy: 'user1',
          entitlementDuration: undefined,
        }),
      );
      expect(memberRepository.insert).toHaveBeenCalledWith({
        memberNickname: 'Nick',
        resourceId: `${Model.PARTY}-sudoku-p1`,
        userId: 'user1',
      });
      expect(result).toEqual({ partyId: 'sudoku-p1' });
    });

    it('grants ONE_MONTH entitlement when the creator has Plus', async () => {
      revenuecatService.hasEntitlement.mockResolvedValue(true);
      partyRepository.insert.mockResolvedValue({ partyId: 'sudoku-p1' });

      await service.create(
        { appId: 'sudoku', partyName: 'Party', memberNickname: 'N' } as never,
        'user1',
      );
      expect(revenuecatService.hasEntitlement).toHaveBeenCalledWith(
        'user1',
        Entitlement.PLUS,
      );
      expect(partyRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlementDuration: EntitlementDuration.ONE_MONTH,
        }),
      );
    });

    it('grants LIFETIME for an admin user with a matching lifetime code', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'adminUsers') return ['user1'];
        if (key === 'codes') return { lifetime: ['GOLD'], oneYear: ['SILVER'] };
        return undefined;
      });
      partyRepository.insert.mockResolvedValue({ partyId: 'sudoku-p1' });

      await service.create(
        {
          appId: 'sudoku',
          partyName: 'my gold party',
          memberNickname: 'N',
        } as never,
        'user1',
      );
      expect(partyRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlementDuration: EntitlementDuration.LIFETIME,
        }),
      );
      expect(revenuecatService.hasEntitlement).not.toHaveBeenCalled();
    });

    it('grants ONE_YEAR for an admin user with a matching oneYear code', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'adminUsers') return ['user1'];
        if (key === 'codes') return { lifetime: ['GOLD'], oneYear: ['SILVER'] };
        return undefined;
      });
      partyRepository.insert.mockResolvedValue({ partyId: 'sudoku-p1' });
      await service.create(
        {
          appId: 'sudoku',
          partyName: 'a SILVER party',
          memberNickname: 'N',
        } as never,
        'user1',
      );
      expect(partyRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlementDuration: EntitlementDuration.ONE_YEAR,
        }),
      );
    });

    it('grants ONE_MONTH for an admin user with no matching code', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'adminUsers') return ['user1'];
        if (key === 'codes') return { lifetime: ['GOLD'], oneYear: ['SILVER'] };
        return undefined;
      });
      partyRepository.insert.mockResolvedValue({ partyId: 'sudoku-p1' });
      await service.create(
        {
          appId: 'sudoku',
          partyName: 'plain party',
          memberNickname: 'N',
        } as never,
        'user1',
      );
      expect(partyRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlementDuration: EntitlementDuration.ONE_MONTH,
        }),
      );
    });

    it('swallows revenuecat errors and creates without entitlement', async () => {
      revenuecatService.hasEntitlement.mockRejectedValue(new Error('rc down'));
      partyRepository.insert.mockResolvedValue({ partyId: 'sudoku-p1' });
      await service.create(
        { appId: 'sudoku', partyName: 'Party', memberNickname: 'N' } as never,
        'user1',
      );
      expect(partyRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ entitlementDuration: undefined }),
      );
    });

    it('swallows errors from entitlement calculation itself', async () => {
      // configService.get throwing bubbles into the outer catch
      configService.get.mockImplementation(() => {
        throw new Error('config unavailable');
      });
      partyRepository.insert.mockResolvedValue({ partyId: 'sudoku-p1' });
      await service.create(
        { appId: 'sudoku', partyName: 'Party', memberNickname: 'N' } as never,
        'user1',
      );
      expect(partyRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ entitlementDuration: undefined }),
      );
    });
  });

  describe('findAllForUser', () => {
    it('returns parties the user is a member of, skipping missing parties', async () => {
      memberRepository.findAllForUser.mockResolvedValue([
        { resourceId: `${Model.PARTY}-sudoku-p1` },
        { resourceId: `${Model.PARTY}-sudoku-p2` },
      ]);
      partyRepository.find
        .mockResolvedValueOnce({ partyId: 'sudoku-p1' })
        .mockResolvedValueOnce(undefined);

      const result = await service.findAllForUser('user1', App.SUDOKU, true);
      expect(result).toEqual([{ partyId: 'sudoku-p1' }]);
      expect(memberRepository.findAllForUser).toHaveBeenCalledWith('user1', {
        type: Model.PARTY,
        idPrefix: App.SUDOKU,
      });
    });
  });

  describe('findForUser', () => {
    it('returns the party when the user is a member and the app matches', async () => {
      memberRepository.findForUser.mockResolvedValue({ userId: 'user1' });
      partyRepository.find.mockResolvedValue({
        partyId: 'p1',
        appId: 'sudoku',
      });
      const result = await service.findForUser('user1', App.SUDOKU, 'p1');
      expect(result).toEqual({ partyId: 'p1', appId: 'sudoku' });
    });

    it('returns undefined when the user is not a member', async () => {
      memberRepository.findForUser.mockResolvedValue(undefined);
      expect(
        await service.findForUser('user1', App.SUDOKU, 'p1'),
      ).toBeUndefined();
    });

    it('returns undefined when the party app does not match', async () => {
      memberRepository.findForUser.mockResolvedValue({ userId: 'user1' });
      partyRepository.find.mockResolvedValue({ partyId: 'p1', appId: 'other' });
      expect(
        await service.findForUser('user1', App.SUDOKU, 'p1'),
      ).toBeUndefined();
    });
  });

  describe('deleteForUser', () => {
    it('deletes a party owned by the user', async () => {
      memberRepository.findForUser.mockResolvedValue({ userId: 'user1' });
      partyRepository.find.mockResolvedValue({
        partyId: 'p1',
        appId: 'sudoku',
        createdBy: 'user1',
      });
      await service.deleteForUser('user1', App.SUDOKU, 'p1');
      expect(partyRepository.destroy).toHaveBeenCalled();
    });

    it('throws when the party is not owned by the user', async () => {
      memberRepository.findForUser.mockResolvedValue({ userId: 'user1' });
      partyRepository.find.mockResolvedValue({
        partyId: 'p1',
        appId: 'sudoku',
        createdBy: 'other',
      });
      await expect(
        service.deleteForUser('user1', App.SUDOKU, 'p1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the party is not found', async () => {
      memberRepository.findForUser.mockResolvedValue(undefined);
      await expect(
        service.deleteForUser('user1', App.SUDOKU, 'p1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateForUser', () => {
    it('updates a party owned by the user', async () => {
      memberRepository.findForUser.mockResolvedValue({ userId: 'user1' });
      partyRepository.find.mockResolvedValue({
        partyId: 'p1',
        appId: 'sudoku',
        createdBy: 'user1',
        partyName: 'Old',
      });
      partyRepository.update.mockResolvedValue({ partyId: 'p1' });
      const result = await service.updateForUser('user1', App.SUDOKU, 'p1', {
        partyName: 'New',
      } as never);
      expect(partyRepository.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ partyName: 'New' }),
      );
      expect(result).toEqual({ partyId: 'p1' });
    });

    it('throws when updating a party not owned by the user', async () => {
      memberRepository.findForUser.mockResolvedValue({ userId: 'user1' });
      partyRepository.find.mockResolvedValue({
        partyId: 'p1',
        appId: 'sudoku',
        createdBy: 'other',
      });
      await expect(
        service.updateForUser('user1', App.SUDOKU, 'p1', {} as never),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
