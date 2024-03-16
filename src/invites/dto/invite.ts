export interface Invite {
  inviteId: string;
  resourceId: string;
  description?: string;
  sessionId?: string;
  createdBy: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
