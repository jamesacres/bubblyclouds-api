import { InvitesController } from './invites.controller';

describe('InvitesController', () => {
  let service: { create: jest.Mock; findPublicInvite: jest.Mock };
  let controller: InvitesController;

  beforeEach(() => {
    service = { create: jest.fn(), findPublicInvite: jest.fn() };
    controller = new InvitesController(service as never);
  });

  it('create delegates to the service with the creator sub', async () => {
    service.create.mockResolvedValue({ inviteId: 'i1' });
    const dto = { resourceId: 'party-p1' };
    const result = await controller.create(
      { user: { sub: 'user1' } } as never,
      dto as never,
    );
    expect(service.create).toHaveBeenCalledWith(dto, 'user1');
    expect(result).toEqual({ inviteId: 'i1' });
  });

  it('findOne passes the optional user sub through', async () => {
    service.findPublicInvite.mockResolvedValue({ resourceId: 'party-p1' });
    const result = await controller.findOne(
      { user: { sub: 'user1' } } as never,
      'i1',
    );
    expect(service.findPublicInvite).toHaveBeenCalledWith('i1', 'user1');
    expect(result).toEqual({ resourceId: 'party-p1' });
  });

  it('findOne tolerates an unauthenticated request (no user)', async () => {
    service.findPublicInvite.mockResolvedValue({ resourceId: 'party-p1' });
    await controller.findOne({} as never, 'i1');
    expect(service.findPublicInvite).toHaveBeenCalledWith('i1', undefined);
  });
});
