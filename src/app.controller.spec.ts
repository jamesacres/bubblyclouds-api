import { AppController } from './app.controller';

describe('AppController', () => {
  const controller = new AppController();

  it('index resolves without a body (redirect handled by decorator)', () => {
    expect(controller.index()).toBeUndefined();
  });

  it('health returns an ok payload', () => {
    expect(controller.health()).toEqual({ ok: true });
  });
});
