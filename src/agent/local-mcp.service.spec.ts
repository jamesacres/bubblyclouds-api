import { LocalMcpService } from './local-mcp.service';

describe('LocalMcpService', () => {
  let service: LocalMcpService;

  beforeEach(() => {
    service = new LocalMcpService();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await service.closeServer().catch(() => undefined);
    jest.restoreAllMocks();
  });

  const connect = async () => {
    await service.connectServer();
    return service.getClient();
  };

  it('lists the available tools', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['calculate_sum', 'fetch_user_data', 'magic_number']);
  });

  it('connectServer is idempotent', async () => {
    await service.connectServer();
    await service.connectServer();
    const client = await service.getClient();
    expect((await client.listTools()).tools.length).toBe(3);
  });

  it('calculate_sum returns the sum of two numbers', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'calculate_sum',
      arguments: { a: 2, b: 3 },
    });
    expect((result.content as { text: string }[])[0].text).toBe('5');
  });

  it('calculate_sum reports an error when args are missing', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'calculate_sum',
      arguments: {},
    });
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0].text).toContain(
      'Missing args',
    );
  });

  it('magic_number returns 9001', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'magic_number',
      arguments: {},
    });
    expect((result.content as { text: string }[])[0].text).toBe('9001');
  });

  it('fetch_user_data returns simulated user data when a user is provided', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'fetch_user_data',
      arguments: { user: { sub: 'user1' } },
    });
    const text = (result.content as { text: string }[])[0].text;
    expect(JSON.parse(text)).toEqual({ name: 'Example Name' });
  });

  it('fetch_user_data reports an error when no user is provided', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'fetch_user_data',
      arguments: {},
    });
    expect(result.isError).toBe(true);
  });

  it('reports an error for an unknown tool', async () => {
    const client = await connect();
    const result = await client.callTool({
      name: 'does_not_exist',
      arguments: {},
    });
    expect(result.isError).toBe(true);
    expect((result.content as { text: string }[])[0].text).toContain(
      'Unknown tool',
    );
  });
});
