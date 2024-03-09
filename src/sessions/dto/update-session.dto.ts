import { OmitType } from '@nestjs/swagger';
import { SessionDto } from './session.dto';

export class UpdateSessionDto extends OmitType(SessionDto, [
  'createdAt',
  'sessionId',
  'updatedAt',
  'userId',
]) {}
