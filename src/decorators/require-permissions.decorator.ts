import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

export const REQUIRE_PERMISSIONS_KEY = 'require-permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
