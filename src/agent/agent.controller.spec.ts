import { AgentController } from './agent.controller';

describe('AgentController', () => {
  it('invoke delegates to the service with the request user and dto', () => {
    const service = {
      invoke: jest.fn().mockResolvedValue({ completion: 'hi' }),
    };
    const controller = new AgentController(service as never);
    const user = { sub: 'user1' };
    const dto = { inputText: 'hello', sessionId: 's1' };
    controller.invoke({ user } as never, dto as never);
    expect(service.invoke).toHaveBeenCalledWith(user, dto);
  });
});
