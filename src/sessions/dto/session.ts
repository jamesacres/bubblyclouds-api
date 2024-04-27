export interface Session {
  sessionId: string;
  userId: string;
  state: object;
  createdAt: Date;
  updatedAt: Date;
}
