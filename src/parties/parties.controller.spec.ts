import { BadRequestException } from '@nestjs/common';
import { PartiesController } from './parties.controller';
import { App } from '@/types/enums/app.enum';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';

const req = (sub = 'user1') => ({ user: { sub } }) as RequestWithUser;

describe('PartiesController', () => {
  let service: {
    create: jest.Mock;
    findAllForUser: jest.Mock;
    deleteForUser: jest.Mock;
    updateForUser: jest.Mock;
  };
  let controller: PartiesController;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAllForUser: jest.fn(),
      deleteForUser: jest.fn(),
      updateForUser: jest.fn(),
    };
    controller = new PartiesController(service as never);
  });

  describe('create', () => {
    it('creates a party for a valid app', async () => {
      service.create.mockResolvedValue({ partyId: 'p1' });
      const dto = { appId: 'sudoku', partyName: 'P', memberNickname: 'N' };
      const result = await controller.create(req(), dto as never);
      expect(service.create).toHaveBeenCalledWith(dto, 'user1');
      expect(result).toEqual({ partyId: 'p1' });
    });

    it('rejects an invalid app', () => {
      expect(() =>
        controller.create(req(), { appId: 'nope' } as never),
      ).toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns parties for a valid app', async () => {
      service.findAllForUser.mockResolvedValue([{ partyId: 'p1' }]);
      const result = await controller.findAll(req(), App.SUDOKU);
      expect(service.findAllForUser).toHaveBeenCalledWith(
        'user1',
        App.SUDOKU,
        true,
      );
      expect(result).toEqual([{ partyId: 'p1' }]);
    });

    it('rejects an invalid app', () => {
      expect(() => controller.findAll(req(), 'nope' as never)).toThrow(
        BadRequestException,
      );
    });
  });

  it('delete delegates to the service', async () => {
    await controller.delete(req(), 'p1', App.SUDOKU);
    expect(service.deleteForUser).toHaveBeenCalledWith(
      'user1',
      App.SUDOKU,
      'p1',
    );
  });

  it('update delegates to the service', async () => {
    service.updateForUser.mockResolvedValue({ partyId: 'p1' });
    const dto = { partyName: 'New' };
    const result = await controller.update(
      req(),
      'p1',
      App.SUDOKU,
      dto as never,
    );
    expect(service.updateForUser).toHaveBeenCalledWith(
      'user1',
      App.SUDOKU,
      'p1',
      dto,
    );
    expect(result).toEqual({ partyId: 'p1' });
  });
});
