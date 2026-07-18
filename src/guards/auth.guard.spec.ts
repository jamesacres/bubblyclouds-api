import { UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY } from '@/decorators/public.decorator';
import { IS_API_KEY } from '@/decorators/api-key.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '@/decorators/require-permissions.decorator';
import { Permission } from '@/types/enums/permission.enum';
import * as fetchPublicKeyModule from '@/utils/fetchPublicKey';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let configService: { get: jest.Mock };

  const buildContext = (headers: Record<string, string> = {}) => {
    const request: Record<string, unknown> = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class {},
      __request: request,
    } as unknown as ExecutionContext & { __request: typeof request };
  };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn() };
    configService = { get: jest.fn() };
    guard = new AuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
      configService as unknown as ConfigService<never, true>,
    );
    jest
      .spyOn(fetchPublicKeyModule, 'fetchPublicKey')
      .mockResolvedValue('public-key');
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  const setReflector = ({
    isPublic = false,
    permissions = undefined as Permission[] | undefined,
    isApiKey = false,
  }) => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return isPublic;
      if (key === REQUIRE_PERMISSIONS_KEY) return permissions;
      if (key === IS_API_KEY) return isApiKey;
      return undefined;
    });
  };

  it('allows public routes with no token', async () => {
    setReflector({ isPublic: true });
    const ctx = buildContext();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('throws when no token is present and route is not public/api-key', async () => {
    setReflector({});
    const ctx = buildContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow('Missing token');
  });

  it('accepts a valid API key via Basic auth', async () => {
    setReflector({ isApiKey: true });
    configService.get.mockReturnValue({ user: { password: 'secret' } });
    const encoded = Buffer.from('user:secret').toString('base64');
    const ctx = buildContext({ authorization: `Basic ${encoded}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects an invalid API key', async () => {
    setReflector({ isApiKey: true });
    configService.get.mockReturnValue({ user: { password: 'secret' } });
    const encoded = Buffer.from('user:wrong').toString('base64');
    const ctx = buildContext({ authorization: `Basic ${encoded}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Missing token');
  });

  it('rejects Basic auth for an unknown username', async () => {
    setReflector({ isApiKey: true });
    configService.get.mockReturnValue({});
    const encoded = Buffer.from('nobody:secret').toString('base64');
    const ctx = buildContext({ authorization: `Basic ${encoded}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Missing token');
  });

  it('verifies a bearer token and assigns the user to the request', async () => {
    setReflector({});
    const payload = { sub: 'user1', scope: 'parties.write' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const ctx = buildContext({ authorization: 'Bearer abc.def.ghi' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((ctx as any).__request.user).toEqual(payload);
    expect((ctx as any).__request.authToken).toBe('abc.def.ghi');
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('abc.def.ghi', {
      publicKey: 'public-key',
      algorithms: ['RS256'],
      audience: 'https://api.bubblyclouds.com',
      issuer: 'https://auth.bubblyclouds.com',
    });
  });

  it('allows when required permissions are present in scope', async () => {
    setReflector({ permissions: [Permission.PARTIES_WRITE] });
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'u',
      scope: 'parties.write members.write',
    });
    const ctx = buildContext({ authorization: 'Bearer token' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects when a required permission is missing from scope', async () => {
    setReflector({ permissions: [Permission.INVITES_WRITE] });
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'u',
      scope: 'parties.write',
    });
    const ctx = buildContext({ authorization: 'Bearer token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when token verification fails', async () => {
    setReflector({});
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
    const ctx = buildContext({ authorization: 'Bearer bad' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('treats a public route with a token as a normal authenticated request', async () => {
    setReflector({ isPublic: true });
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u', scope: '' });
    const ctx = buildContext({ authorization: 'Bearer token' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((ctx as any).__request.user).toEqual({ sub: 'u', scope: '' });
  });

  it('ignores malformed Basic auth (bad base64 -> no credentials)', async () => {
    setReflector({ isApiKey: true });
    configService.get.mockReturnValue({});
    // "Basic" with a token that decodes without a colon
    const encoded = Buffer.from('nocolon').toString('base64');
    const ctx = buildContext({ authorization: `Basic ${encoded}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow('Missing token');
  });
});
