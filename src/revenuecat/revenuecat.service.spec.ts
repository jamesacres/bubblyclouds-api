import { RevenuecatService } from './revenuecat.service';
import { Entitlement } from '@/types/enums/entitlement.enum';
import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';

describe('RevenuecatService', () => {
  const realFetch = global.fetch;
  let configService: { get: jest.Mock };
  let service: RevenuecatService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue({ apiKey: 'rc-key' }) };
    service = new RevenuecatService(configService as never);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  describe('hasEntitlement', () => {
    it('returns true for a never-expiring entitlement', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: { [Entitlement.PLUS]: { expires_date: null } },
          },
        }),
      });
      expect(await service.hasEntitlement('user1', Entitlement.PLUS)).toBe(
        true,
      );
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.revenuecat.com/v1/subscribers/user1',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('returns true when the entitlement expiry is in the future', async () => {
      const future = new Date(Date.now() + 100000).toISOString();
      fetchMock.mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: { [Entitlement.PLUS]: { expires_date: future } },
          },
        }),
      });
      expect(await service.hasEntitlement('user1', Entitlement.PLUS)).toBe(
        true,
      );
    });

    it('returns false when the entitlement has expired', async () => {
      const past = new Date(Date.now() - 100000).toISOString();
      fetchMock.mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          subscriber: {
            entitlements: { [Entitlement.PLUS]: { expires_date: past } },
          },
        }),
      });
      expect(await service.hasEntitlement('user1', Entitlement.PLUS)).toBe(
        false,
      );
    });

    it('returns false when the customer is not found (404)', async () => {
      fetchMock.mockResolvedValue({
        status: 404,
        ok: false,
        json: async () => ({}),
      });
      expect(await service.hasEntitlement('user1', Entitlement.PLUS)).toBe(
        false,
      );
    });

    it('throws when the api key is missing', async () => {
      configService.get.mockReturnValue(undefined);
      await expect(
        service.hasEntitlement('user1', Entitlement.PLUS),
      ).rejects.toThrow('missing apiKey');
    });

    it('throws on an unexpected error status', async () => {
      fetchMock.mockResolvedValue({
        status: 500,
        ok: false,
        json: async () => ({ error: 'boom' }),
      });
      await expect(
        service.hasEntitlement('user1', Entitlement.PLUS),
      ).rejects.toThrow('unexpected response status');
    });

    it('throws even when the error body cannot be parsed', async () => {
      fetchMock.mockResolvedValue({
        status: 503,
        ok: false,
        json: jest.fn().mockRejectedValue(new Error('not json')),
      });
      await expect(
        service.hasEntitlement('user1', Entitlement.PLUS),
      ).rejects.toThrow('unexpected response status');
    });
  });

  describe('grantEntitlement', () => {
    it('grants a lifetime entitlement', async () => {
      fetchMock.mockResolvedValue({ status: 204, ok: true });
      await service.grantEntitlement(
        'user1',
        Entitlement.PLUS,
        EntitlementDuration.LIFETIME,
      );
      const [, options] = fetchMock.mock.calls[0];
      expect(JSON.parse(options.body)).toEqual({ duration: 'lifetime' });
    });

    it('grants a one-month entitlement with an end time', async () => {
      fetchMock.mockResolvedValue({ status: 204, ok: true });
      await service.grantEntitlement(
        'user1',
        Entitlement.PLUS,
        EntitlementDuration.ONE_MONTH,
      );
      const [, options] = fetchMock.mock.calls[0];
      expect(JSON.parse(options.body).end_time_ms).toEqual(expect.any(Number));
    });

    it('grants a one-year entitlement with an end time', async () => {
      fetchMock.mockResolvedValue({ status: 204, ok: true });
      await service.grantEntitlement(
        'user1',
        Entitlement.PLUS,
        EntitlementDuration.ONE_YEAR,
      );
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain('/entitlements/Plus/promotional');
      expect(JSON.parse(options.body).end_time_ms).toEqual(expect.any(Number));
    });
  });
});
