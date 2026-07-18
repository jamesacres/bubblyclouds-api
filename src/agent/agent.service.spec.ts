import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { ThrottlingException } from '@aws-sdk/client-bedrock-agent-runtime';
import { constants } from 'http2';
import { AgentService } from './agent.service';
import { User } from '@/types/interfaces/user';

const user: User = {
  jti: 'j',
  sub: 'user1',
  iat: 0,
  exp: 0,
  scope: '',
  client_id: 'c',
  iss: 'i',
  aud: 'a',
};

// Build an async-iterable completion stream from a list of events
const stream = (events: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const event of events) {
      yield event;
    }
  },
});

const encode = (text: string) => new TextEncoder().encode(text);

describe('AgentService', () => {
  let service: AgentService;
  let send: jest.Mock;

  beforeEach(() => {
    service = new AgentService();
    send = jest.fn();
    // Replace the real bedrock client with a mock
    (
      service as unknown as { bedrockClient: { send: jest.Mock } }
    ).bedrockClient = { send };
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns a completion when the agent responds with text', async () => {
    send.mockResolvedValue({
      completion: stream([{ chunk: { bytes: encode('Hello there') } }]),
    });
    const result = await service.invoke(user, {
      inputText: 'hi',
      sessionId: 's1',
    });
    expect(result).toEqual({ completion: 'Hello there' });
  });

  it('throws a 429 HttpException when bedrock throttles', async () => {
    send.mockRejectedValue(
      new ThrottlingException({ message: 'slow down', $metadata: {} }),
    );
    await expect(
      service.invoke(user, { inputText: 'hi', sessionId: 's1' }),
    ).rejects.toMatchObject({
      constructor: HttpException,
    });
    await expect(
      service.invoke(user, { inputText: 'hi', sessionId: 's1' }),
    ).rejects.toHaveProperty('status', constants.HTTP_STATUS_TOO_MANY_REQUESTS);
  });

  it('throws InternalServerErrorException when there is no completion', async () => {
    send.mockResolvedValue({ completion: stream([]) });
    await expect(
      service.invoke(user, { inputText: 'hi', sessionId: 's1' }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('executes a returnControl tool call then loops to a final completion', async () => {
    // First response: return control asking to run magic_number
    send.mockResolvedValueOnce({
      completion: stream([
        {
          returnControl: {
            invocationId: 'inv1',
            invocationInputs: [
              {
                functionInvocationInput: {
                  actionGroup: 'bubblyclouds',
                  agentId: 'agent1',
                  function: 'magic_number',
                  parameters: [],
                },
              },
            ],
          },
        },
      ]),
    });
    // Second response: final completion
    send.mockResolvedValueOnce({
      completion: stream([{ chunk: { bytes: encode('The answer is 9001') } }]),
    });

    const result = await service.invoke(user, {
      inputText: 'magic',
      sessionId: 's1',
    });
    expect(result).toEqual({ completion: 'The answer is 9001' });
    expect(send).toHaveBeenCalledTimes(2);
    // The second call should carry the tool result in inlineSessionState
    const secondInput = send.mock.calls[1][0].input;
    expect(secondInput.inlineSessionState.invocationId).toBe('inv1');
    expect(
      secondInput.inlineSessionState.returnControlInvocationResults[0]
        .functionResult.responseBody.TEXT.body,
    ).toBe('9001');
  });

  it('returns "Error" as the tool body when an unknown tool is requested', async () => {
    send.mockResolvedValueOnce({
      completion: stream([
        {
          returnControl: {
            invocationId: 'inv1',
            invocationInputs: [
              {
                functionInvocationInput: {
                  actionGroup: 'bubblyclouds',
                  agentId: 'agent1',
                  function: 'not_a_tool',
                  parameters: [],
                },
              },
            ],
          },
        },
      ]),
    });
    send.mockResolvedValueOnce({
      completion: stream([{ chunk: { bytes: encode('done') } }]),
    });

    const result = await service.invoke(user, {
      inputText: 'x',
      sessionId: 's1',
    });
    expect(result).toEqual({ completion: 'done' });
    const secondInput = send.mock.calls[1][0].input;
    expect(
      secondInput.inlineSessionState.returnControlInvocationResults[0]
        .functionResult.responseBody.TEXT.body,
    ).toBe('Error');
  });
});
