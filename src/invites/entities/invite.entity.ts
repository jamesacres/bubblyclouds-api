import { Invite } from '../dto/invite';

export class InviteEntity implements Invite {
  inviteId: string;
  resourceId: string;
  description?: string;
  sessionId?: string;
  createdBy: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    inviteId,
    resourceId,
    description,
    sessionId,
    createdBy,
    expiresAt,
    createdAt,
    updatedAt,
  }: Invite) {
    this.inviteId = inviteId;
    this.resourceId = resourceId;
    this.description = description;
    this.sessionId = sessionId;
    this.createdBy = createdBy;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
