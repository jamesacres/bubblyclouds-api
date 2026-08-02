import { AccountController } from './account.controller';

describe('AccountController', () => {
  it('delete delegates to the service with the user sub and auth token', async () => {
    const service = { delete: jest.fn().mockResolvedValue(undefined) };
    const controller = new AccountController(service as never);
    await controller.delete({
      user: { sub: 'user1' },
      authToken: 'token',
    } as never);
    expect(service.delete).toHaveBeenCalledWith('user1', 'token');
  });
});
