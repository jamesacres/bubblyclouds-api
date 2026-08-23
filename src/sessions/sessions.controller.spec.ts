import { BadRequestException } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { App } from '@/types/enums/app.enum';
import { constants } from 'http2';
import { Response } from 'express';

const req = (sub = 'user1') => ({ user: { sub } }) as never;
const res = () => {
  return { status: jest.fn() } as unknown as Response;
};

describe('SessionsController', () => {
  let sessionsService: {
    findAllForUser: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let partiesService: { findForUser: jest.Mock };
  let controller: SessionsController;

  beforeEach(() => {
    sessionsService = {
      findAllForUser: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    partiesService = { findForUser: jest.fn() };
    controller = new SessionsController(
      sessionsService as never,
      partiesService as never,
    );
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('findAll', () => {
    it('rejects an invalid app', async () => {
      await expect(controller.findAll(req(), 'nope' as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns the callers own sessions when no userId is provided', async () => {
      sessionsService.findAllForUser.mockResolvedValue([{ sessionId: 's1' }]);
      const result = await controller.findAll(req(), App.SUDOKU);
      expect(sessionsService.findAllForUser).toHaveBeenCalledWith(
        'user1',
        App.SUDOKU,
      );
      expect(result).toEqual([{ sessionId: 's1' }]);
    });

    it('returns the callers own sessions when userId equals the caller', async () => {
      sessionsService.findAllForUser.mockResolvedValue([]);
      await controller.findAll(req('user1'), App.SUDOKU, 'p1', 'user1');
      expect(sessionsService.findAllForUser).toHaveBeenCalledWith(
        'user1',
        App.SUDOKU,
      );
    });

    it('returns empty when a friend userId is requested without a partyId', async () => {
      const result = await controller.findAll(
        req('user1'),
        App.SUDOKU,
        undefined,
        'friend',
      );
      expect(result).toEqual([]);
    });

    it('returns empty when the caller is not a member of the party', async () => {
      partiesService.findForUser.mockResolvedValue(undefined);
      const result = await controller.findAll(
        req('user1'),
        App.SUDOKU,
        'p1',
        'friend',
      );
      expect(result).toEqual([]);
    });

    it('returns empty when the requested friend is not a member of the party', async () => {
      partiesService.findForUser
        .mockResolvedValueOnce({ partyId: 'p1' }) // caller is a member
        .mockResolvedValueOnce(undefined); // friend is not
      const result = await controller.findAll(
        req('user1'),
        App.SUDOKU,
        'p1',
        'friend',
      );
      expect(result).toEqual([]);
    });

    it('returns the friends sessions when both are members of the party', async () => {
      partiesService.findForUser
        .mockResolvedValueOnce({ partyId: 'p1' })
        .mockResolvedValueOnce({ partyId: 'p1' });
      sessionsService.findAllForUser.mockResolvedValue([{ sessionId: 'fs1' }]);
      const result = await controller.findAll(
        req('user1'),
        App.SUDOKU,
        'p1',
        'friend',
      );
      expect(sessionsService.findAllForUser).toHaveBeenCalledWith(
        'friend',
        App.SUDOKU,
      );
      expect(result).toEqual([{ sessionId: 'fs1' }]);
    });
  });

  it('findOne delegates to the service, returns with state', async () => {
    const response = res();
    sessionsService.findOne.mockResolvedValue({
      sessionId: 'sudoku-s1',
      state: {},
    });
    const result = await controller.findOne(req(), 'sudoku-s1', response);
    expect(sessionsService.findOne).toHaveBeenCalledWith('sudoku-s1', 'user1');
    expect(result).toStrictEqual({ sessionId: 'sudoku-s1', state: {} });
    expect(response.status).not.toHaveBeenCalled();
  });

  it('findOne returns parties with not found status when no state', async () => {
    const response = res();
    sessionsService.findOne.mockResolvedValue({ parties: {} });
    const result = await controller.findOne(req(), 'sudoku-s1', response);
    expect(sessionsService.findOne).toHaveBeenCalledWith('sudoku-s1', 'user1');
    expect(result).toStrictEqual({ parties: {} });
    expect(response.status).toHaveBeenCalledWith(
      constants.HTTP_STATUS_NOT_FOUND,
    );
  });

  describe('update', () => {
    it('updates a session with valid state', async () => {
      sessionsService.update.mockResolvedValue({ sessionId: 'sudoku-s1' });
      const dto = { state: { a: 1 } };
      const result = await controller.update(req(), 'sudoku-s1', dto as never);
      expect(sessionsService.update).toHaveBeenCalledWith(
        'sudoku-s1',
        'user1',
        dto,
      );
      expect(result).toEqual({ sessionId: 'sudoku-s1' });
    });

    it('rejects when state is missing', () => {
      expect(() => controller.update(req(), 'sudoku-s1', {} as never)).toThrow(
        BadRequestException,
      );
    });

    it('rejects an invalid session id', () => {
      expect(() =>
        controller.update(req(), 'nope-s1', { state: {} } as never),
      ).toThrow(BadRequestException);
    });
  });
});
