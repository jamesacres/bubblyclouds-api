import { Request } from 'express';
import { User } from './user';

export interface RequestWithUser extends Request {
  user: User;
  authToken: string;
}

export interface RequestWithOptionalUser extends Omit<RequestWithUser, 'user'> {
  user?: User;
}
