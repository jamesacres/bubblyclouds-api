import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { REQUIRE_PERMISSIONS_KEY } from 'src/decorators/require-permissions.decorator';
import { Permission } from 'src/enums/permission.enum';
import { createPublicKey } from 'crypto';

// https://docs.nestjs.com/security/authentication
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  private async fetchPublicKey(): Promise<string> {
    const response = await fetch('https://auth.bubblyclouds.com/jwks');
    const jwks = await response.json();
    const key = createPublicKey({
      key: jwks.keys.find(
        (key: JsonWebKey) => key.kty === 'RSA' && key.use === 'sig',
      ),
      format: 'jwk',
    });
    return key.export({ type: 'pkcs1', format: 'pem' }).toString();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requirePermissions = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }
    try {
      const publicKey = await this.fetchPublicKey();
      const payload = await this.jwtService.verifyAsync(token, {
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
      request['user'] = payload;
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
}
