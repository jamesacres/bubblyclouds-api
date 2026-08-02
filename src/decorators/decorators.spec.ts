import { Reflector } from '@nestjs/core';
import { Public, IS_PUBLIC_KEY } from './public.decorator';
import { ApiKey, IS_API_KEY } from './api-key.decorator';
import {
  RequirePermissions,
  REQUIRE_PERMISSIONS_KEY,
} from './require-permissions.decorator';
import { Permission } from '@/types/enums/permission.enum';

describe('metadata decorators', () => {
  const reflector = new Reflector();

  it('Public sets the isPublic metadata', () => {
    class Target {
      @Public()
      handler() {}
    }
    expect(reflector.get(IS_PUBLIC_KEY, Target.prototype.handler)).toBe(true);
  });

  it('ApiKey sets the isApiKey metadata', () => {
    class Target {
      @ApiKey()
      handler() {}
    }
    expect(reflector.get(IS_API_KEY, Target.prototype.handler)).toBe(true);
  });

  it('RequirePermissions stores the list of permissions', () => {
    class Target {
      @RequirePermissions(Permission.PARTIES_WRITE, Permission.MEMBERS_WRITE)
      handler() {}
    }
    expect(
      reflector.get(REQUIRE_PERMISSIONS_KEY, Target.prototype.handler),
    ).toEqual([Permission.PARTIES_WRITE, Permission.MEMBERS_WRITE]);
  });
});
