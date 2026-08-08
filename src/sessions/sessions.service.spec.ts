import { NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { App } from '@/types/enums/app.enum';

describe('SessionsService', () => {
  let sessionRepository: {
    find: jest.Mock;
    upsert: jest.Mock;
    findAllForUser: jest.Mock;
  };
  let partiesService: { findAllForUser: jest.Mock };
  let memberRepository: Record<string, jest.Mock>;
  let service: SessionsService;

  beforeEach(() => {
    sessionRepository = {
      find: jest.fn(),
      upsert: jest.fn(),
      findAllForUser: jest.fn(),
    };
    partiesService = { findAllForUser: jest.fn() };
    memberRepository = {};
    service = new SessionsService(
      sessionRepository as never,
      partiesService as never,
      memberRepository as never,
    );
  });

  describe('findPartyMemberSessions', () => {
    it('collects sessions of other members across the users parties', async () => {
      const otherMember = {
        userId: 'other',
        getSession: jest
          .fn()
          .mockResolvedValue({ userId: 'other', sessionId: 'sudoku-s1' }),
      };
      const selfMember = { userId: 'user1', getSession: jest.fn() };
      const party = {
        partyId: 'p1',
        findMembers: jest.fn().mockResolvedValue([otherMember, selfMember]),
      };
      partiesService.findAllForUser.mockResolvedValue([party]);

      const result = await service.findPartyMemberSessions(
        'sudoku-s1',
        'user1',
      );
      expect(result).toEqual({
        p1: {
          memberSessions: {
            other: { userId: 'other', sessionId: 'sudoku-s1' },
          },
        },
      });
      // Own session is skipped
      expect(selfMember.getSession).not.toHaveBeenCalled();
    });

    it('omits members without a session for this sessionId', async () => {
      const otherMember = {
        userId: 'other',
        getSession: jest.fn().mockResolvedValue(undefined),
      };
      const party = {
        partyId: 'p1',
        findMembers: jest.fn().mockResolvedValue([otherMember]),
      };
      partiesService.findAllForUser.mockResolvedValue([party]);
      const result = await service.findPartyMemberSessions(
        'sudoku-s1',
        'user1',
      );
      expect(result).toEqual({ p1: { memberSessions: {} } });
    });
  });

  describe('findOne', () => {
    it('returns the session with party member sessions', async () => {
      sessionRepository.find.mockResolvedValue({
        sessionId: 'sudoku-s1',
        userId: 'user1',
        state: {},
      });
      partiesService.findAllForUser.mockResolvedValue([]);
      const result = await service.findOne('sudoku-s1', 'user1');
      expect(result).toMatchObject({ sessionId: 'sudoku-s1', parties: {} });
    });

    it('throws when the session does not exist', async () => {
      sessionRepository.find.mockResolvedValue(undefined);
      await expect(service.findOne('sudoku-s1', 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns no parties for an app not in APPS_ALLOWING_PARTY_SESSIONS_IN_RESPONSE', async () => {
      const appEnum = jest.requireActual('@/types/enums/app.enum');
      jest
        .spyOn(appEnum.APPS_ALLOWING_PARTY_SESSIONS_IN_RESPONSE, 'includes')
        .mockReturnValue(false);
      sessionRepository.find.mockResolvedValue({
        sessionId: 'sudoku-s1',
        userId: 'user1',
        state: {},
      });

      const result = await service.findOne('sudoku-s1', 'user1');
      expect(result).toMatchObject({ sessionId: 'sudoku-s1', parties: {} });
      expect(partiesService.findAllForUser).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('update', () => {
    it('upserts the session and returns it with party member sessions', async () => {
      sessionRepository.upsert.mockResolvedValue({
        sessionId: 'sudoku-s1',
        userId: 'user1',
        state: { a: 1 },
      });
      partiesService.findAllForUser.mockResolvedValue([]);
      const result = await service.update('sudoku-s1', 'user1', {
        state: { a: 1 },
      } as never);
      expect(sessionRepository.upsert).toHaveBeenCalledWith(
        'sudoku-s1',
        'user1',
        { state: { a: 1 } },
      );
      expect(result).toMatchObject({ sessionId: 'sudoku-s1', parties: {} });
    });

    it('returns no parties for an app not in APPS_ALLOWING_PARTY_SESSIONS_IN_RESPONSE', async () => {
      const appEnum = jest.requireActual('@/types/enums/app.enum');
      jest
        .spyOn(appEnum.APPS_ALLOWING_PARTY_SESSIONS_IN_RESPONSE, 'includes')
        .mockReturnValue(false);
      sessionRepository.upsert.mockResolvedValue({
        sessionId: 'sudoku-s1',
        userId: 'user1',
        state: { a: 1 },
      });

      const result = await service.update('sudoku-s1', 'user1', {
        state: { a: 1 },
      } as never);
      expect(result).toMatchObject({ sessionId: 'sudoku-s1', parties: {} });
      expect(partiesService.findAllForUser).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('findAllForUser', () => {
    it('delegates to the repository', async () => {
      sessionRepository.findAllForUser.mockResolvedValue([{ sessionId: 's1' }]);
      const result = await service.findAllForUser('user1', App.SUDOKU);
      expect(sessionRepository.findAllForUser).toHaveBeenCalledWith(
        'user1',
        App.SUDOKU,
      );
      expect(result).toEqual([{ sessionId: 's1' }]);
    });
  });
});
