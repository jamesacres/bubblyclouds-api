const sendMock = jest.fn();

jest.mock('@aws-sdk/client-appconfigdata', () => ({
  AppConfigDataClient: jest.fn().mockImplementation(() => ({
    send: sendMock,
  })),
  StartConfigurationSessionCommand: jest
    .fn()
    .mockImplementation((input) => ({ __type: 'start', input })),
  GetLatestConfigurationCommand: jest
    .fn()
    .mockImplementation((input) => ({ __type: 'get', input })),
}));

describe('fetchAppConfig', () => {
  const realFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    sendMock.mockReset();
    // Clear all relevant env between tests
    delete process.env.AWS_APPCONFIG_EXTENSION_PREFETCH_LIST;
    delete process.env.APP_CONFIG_APPLICATION_ID;
    delete process.env.APP_CONFIG_ENVIRONMENT_ID;
    delete process.env.APP_CONFIG_CONFIGURATION_ID;
    delete process.env.APP_CONFIG_API_KEY_USERNAME;
    delete process.env.APP_CONFIG_API_KEY_PASSWORD;
  });

  afterEach(() => {
    global.fetch = realFetch;
    process.env = { ...originalEnv };
  });

  it('uses process.env overrides when no lambda layer or app config is present', async () => {
    process.env.APP_CONFIG_API_KEY_USERNAME = 'apiuser';
    process.env.APP_CONFIG_API_KEY_PASSWORD = 'apipass';

    const { fetchAppConfig } = await import('./fetchAppConfig');
    const config = await fetchAppConfig();
    expect(config.apiKeys).toEqual({ apiuser: { password: 'apipass' } });

    // cached second call
    const config2 = await fetchAppConfig();
    expect(config2).toBe(config);
  });

  it('produces empty apiKeys object when no override env is present', async () => {
    const { fetchAppConfig } = await import('./fetchAppConfig');
    const config = await fetchAppConfig();
    expect(config.apiKeys).toEqual({});
  });

  it('fetches config from the lambda extension prefetch layer', async () => {
    process.env.AWS_APPCONFIG_EXTENSION_PREFETCH_LIST = '/app/env/config';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ adminUsers: ['admin1'] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { fetchAppConfig } = await import('./fetchAppConfig');
    const config = await fetchAppConfig();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:2772/app/env/config',
    );
    expect(config.adminUsers).toEqual(['admin1']);
  });

  it('throws when the lambda extension responds not ok', async () => {
    process.env.AWS_APPCONFIG_EXTENSION_PREFETCH_LIST = '/app/env/config';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => 'boom',
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { fetchAppConfig } = await import('./fetchAppConfig');
    await expect(fetchAppConfig()).rejects.toThrow('boom');
  });

  it('merges api key override on top of the prefetched config', async () => {
    process.env.AWS_APPCONFIG_EXTENSION_PREFETCH_LIST = '/app/env/config';
    process.env.APP_CONFIG_API_KEY_USERNAME = 'u';
    process.env.APP_CONFIG_API_KEY_PASSWORD = 'p';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ apiKeys: { existing: { password: 'x' } } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { fetchAppConfig } = await import('./fetchAppConfig');
    const config = await fetchAppConfig();
    expect(config.apiKeys).toEqual({
      existing: { password: 'x' },
      u: { password: 'p' },
    });
  });

  it('fetches config from AppConfigData client when configured', async () => {
    process.env.APP_CONFIG_APPLICATION_ID = 'app';
    process.env.APP_CONFIG_ENVIRONMENT_ID = 'env';
    process.env.APP_CONFIG_CONFIGURATION_ID = 'conf';

    sendMock.mockResolvedValueOnce({
      InitialConfigurationToken: 'token-123',
    });
    const configuration = new TextEncoder().encode(
      JSON.stringify({ revenueCat: { apiKey: 'rc-key' } }),
    );
    sendMock.mockResolvedValueOnce({ Configuration: configuration });

    const { fetchAppConfig } = await import('./fetchAppConfig');
    const config = await fetchAppConfig();
    expect(config.revenueCat).toEqual({ apiKey: 'rc-key' });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('handles an empty AppConfigData response', async () => {
    process.env.APP_CONFIG_APPLICATION_ID = 'app';
    process.env.APP_CONFIG_ENVIRONMENT_ID = 'env';
    process.env.APP_CONFIG_CONFIGURATION_ID = 'conf';

    sendMock.mockResolvedValueOnce({ InitialConfigurationToken: 'token' });
    sendMock.mockResolvedValueOnce({ Configuration: undefined });

    const { fetchAppConfig } = await import('./fetchAppConfig');
    const config = await fetchAppConfig();
    expect(config.apiKeys).toEqual({});
  });
});
