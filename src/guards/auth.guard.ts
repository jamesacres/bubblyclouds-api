import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '@/decorators/public.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '@/decorators/require-permissions.decorator';
import { Permission } from '@/types/enums/permission.enum';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';
import { User } from '@/types/interfaces/user';
import { fetchPublicKey } from '@/utils/fetchPublicKey';
import { IS_API_KEY } from '@/decorators/api-key.decorator';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '@/types/interfaces/appConfig';

// https://docs.nestjs.com/security/authentication
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: RequestWithUser = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic && !token) {
      return true;
    }

    const requirePermissions = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!token) {
      // If no Bearer token see if we have a valid API Key instead
      const isApiKey = this.reflector.getAllAndOverride<boolean>(IS_API_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isApiKey) {
        // See if we have an API key instead
        const { username, password } =
          this.extractBasicAuthFromHeader(request) || {};
        if (username && password) {
          const apiKeys =
            this.configService.get<AppConfig['apiKeys']>('apiKeys');
          if (apiKeys[username] && apiKeys[username]?.password === password) {
            return true;
          }
        }
      }

      throw new UnauthorizedException('Missing token');
    }
    try {
      const publicKey = await fetchPublicKey();
      const payload: User = await this.jwtService.verifyAsync(token, {
        publicKey,
        algorithms: ['RS256'],
        audience: 'https://api.bubblyclouds.com',
        issuer: 'https://auth.bubblyclouds.com',
      });
      if (requirePermissions) {
        const scopes = payload.scope.split(' ');
        if (
          requirePermissions.some(
            (requirePermission) => !scopes.includes(requirePermission),
          )
        ) {
          throw new UnauthorizedException('Missing required permission');
        }
      }

      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      console.info('user', payload);
      request['user'] = payload;
      request['authToken'] = token;
    } catch (e) {
      console.warn(e);
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractBasicAuthFromHeader(request: Request):
    | {
        username: string;
        password: string;
      }
    | undefined {
    const [type, encoded] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Basic') {
      try {
        const credentials = Buffer.from(encoded, 'base64').toString();
        const [username, password] = credentials?.split(':') ?? [];
        if (username && password) {
          return {
            username,
            password,
          };
        }
      } catch (e) {
        console.warn(e);
      }
    }
    return undefined;
  }
}
