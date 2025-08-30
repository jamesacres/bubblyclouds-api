import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';

export interface Party {
  partyId: string;
  appId: string;
  partyName: string;
  createdBy: string;
  maxSize?: number;
  entitlementDuration?: EntitlementDuration;
  createdAt: Date;
  updatedAt: Date;
}
