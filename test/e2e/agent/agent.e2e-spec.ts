/**
 * E2E tests for the agent route, driving the full Nest app over HTTP against
 * local DynamoDB.
 *
 * The only genuinely external dependency is the Bedrock agent runtime, so this
 * suite mocks @aws-sdk/client-bedrock-agent-runtime: BedrockAgentRuntimeClient's
 * send() is replaced with a jest mock whose result each test controls. The MCP
 * layer (LocalMcpService) uses an in-memory transport and needs no mocking.
 *
 * Prerequisites:
 *   - Local DynamoDB running at http://localhost:8000 (`npm run dynamodb:start`)
 *
 * Run with: npm run test:e2e
 */
// jest hoists jest.mock above imports, so the factories lazily require their
// helpers (which run after modules initialise). See test/e2e/setup/mocks.ts.
jest.mock('@/utils/fetchPublicKey', () => ({
  fetchPublicKey: jest.fn(
    async () => require('../setup/auth').TEST_PUBLIC_KEY_PEM,
  ),
}));
jest.mock('@/utils/fetchAppConfig', () => ({
  fetchAppConfig: jest.fn(
    async () => require('../setup/mocks').STATIC_APP_CONFIG,
  ),
}));
jest.mock('@/revenuecat/revenuecat.service', () => ({
  RevenuecatService: require('../setup/mocks').RevenuecatServiceStub,
}));

// Mock the Bedrock agent runtime. bedrockSend is a shared jest.fn the tests
// program per-case; the real command classes are preserved as inert shells.
jest.mock('@aws-sdk/client-bedrock-agent-runtime', () => {
  const bedrockSend = jest.fn();
  class ThrottlingException extends Error {
    constructor() {
      super('Throttled');
      this.name = 'ThrottlingException';
    }
  }
  return {
    __esModule: true,
    __bedrockSend: bedrockSend,
    BedrockAgentRuntimeClient: class {
      send = bedrockSend;
    },
    InvokeInlineAgentCommand: class {
      constructor(public input: unknown) {}
    },
    ThrottlingException,
  };
});

const request = require('supertest');
import { startE2E, stopE2E, bearer, clearTable } from '../setup/harness';

jest.setTimeout(60000);

// Async-iterable completion stream helper (mirrors agent.service.spec.ts).
const stream = (events: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const event of events) {
      yield event;
    }
  },
});
const encode = (text: string) => new TextEncoder().encode(text);

const bedrock = require('@aws-sdk/client-bedrock-agent-runtime');
const bedrockSend: jest.Mock = bedrock.__bedrockSend;
const ThrottlingException = bedrock.ThrottlingException;

describe('Agent (e2e)', () => {
  let server: import('http').Server;

  beforeAll(async () => {
    server = await startE2E();
  });

  afterAll(async () => {
    await stopE2E();
  });

  beforeEach(async () => {
    await clearTable();
    bedrockSend.mockReset();
  });

  it('rejects an unauthenticated request', async () => {
    await request(server)
      .post('/agent/invoke')
      .send({ inputText: 'hi', sessionId: 's1' })
      .expect(401);
  });

  it('validates the request body', async () => {
    await request(server)
      .post('/agent/invoke')
      .set('Authorization', bearer())
      .send({ inputText: 'hi' }) // missing sessionId
      .expect(400);
    expect(bedrockSend).not.toHaveBeenCalled();
  });

  it('returns the agent completion for a valid request', async () => {
    bedrockSend.mockResolvedValue({
      completion: stream([
        { chunk: { bytes: encode('Hello from the agent') } },
      ]),
    });

    await request(server)
      .post('/agent/invoke')
      .set('Authorization', bearer({ sub: 'agent-user' }))
      .send({ inputText: 'say hello', sessionId: 'session-1' })
      .expect(200)
      .expect((res: { body: { completion: string } }) => {
        expect(res.body.completion).toBe('Hello from the agent');
      });
    expect(bedrockSend).toHaveBeenCalledTimes(1);
  });

  it('maps a Bedrock throttling error to 429', async () => {
    bedrockSend.mockRejectedValue(new ThrottlingException());

    await request(server)
      .post('/agent/invoke')
      .set('Authorization', bearer())
      .send({ inputText: 'hi', sessionId: 'session-2' })
      .expect(429);
  });

  it('returns 500 when the agent produces no completion', async () => {
    bedrockSend.mockResolvedValue({ completion: stream([]) });

    await request(server)
      .post('/agent/invoke')
      .set('Authorization', bearer())
      .send({ inputText: 'hi', sessionId: 'session-3' })
      .expect(500);
  });
});
