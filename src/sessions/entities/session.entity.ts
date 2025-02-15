import { Session } from '../dto/session';

export class SessionEntity implements Session {
  sessionId: string;
  userId: string;
  state: object;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor({
    sessionId,
    userId,
    state,
    expiresAt,
    createdAt,
    updatedAt,
  }: Session) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.state = state;
    this.expiresAt = expiresAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
