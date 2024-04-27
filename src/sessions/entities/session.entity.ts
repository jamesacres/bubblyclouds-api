import { Session } from '../dto/session';

export class SessionEntity implements Session {
  sessionId: string;
  userId: string;
  state: object;
  createdAt: Date;
  updatedAt: Date;

  constructor({ sessionId, userId, state, createdAt, updatedAt }: Session) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.state = state;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
