export interface Session {
  sessionId: string;
  userId: string;
  state: object;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
