import { BadRequestException } from '@nestjs/common';
import { MembersController } from './members.controller';

const req = (sub = 'user1') => ({ user: { sub } }) as never;

describe('MembersController', () => {
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    deleteForUser: jest.Mock;
  };
  let controller: MembersController;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      deleteForUser: jest.fn(),
    };
    controller = new MembersController(service as never);
  });

  it('create delegates to the service', async () => {
    service.create.mockResolvedValue({ userId: 'user1' });
    const dto = { inviteId: 'i1', memberNickname: 'N' };
    const result = await controller.create(req(), dto as never);
    expect(service.create).toHaveBeenCalledWith(dto, 'user1');
    expect(result).toEqual({ userId: 'user1' });
  });

  describe('findAll', () => {
    it('returns members for a resource', async () => {
      service.findAll.mockResolvedValue([{ userId: 'user1' }]);
      const result = await controller.findAll(req(), 'party-p1');
      expect(service.findAll).toHaveBeenCalledWith('party-p1', 'user1');
      expect(result).toEqual([{ userId: 'user1' }]);
    });

    it('rejects a missing resourceId', () => {
      expect(() => controller.findAll(req(), '')).toThrow(BadRequestException);
    });
  });

  it('delete delegates to the service', async () => {
    await controller.delete(req(), 'target', 'party-p1');
    expect(service.deleteForUser).toHaveBeenCalledWith(
      'user1',
      'party-p1',
      'target',
    );
  });
});
