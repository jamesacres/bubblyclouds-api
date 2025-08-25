export interface Party {
  partyId: string;
  appId: string;
  partyName: string;
  createdBy: string;
  maxSize?: number;
  createdAt: Date;
  updatedAt: Date;
}
