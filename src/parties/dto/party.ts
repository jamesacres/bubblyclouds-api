import { App } from '@/types/enums/app.enum';
import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';

export interface Party {
  partyId: string;
  appId: App;
  partyName: string;
  createdBy: string;
  maxSize?: number;
  entitlementDuration?: EntitlementDuration;
  createdAt: Date;
  updatedAt: Date;
}
