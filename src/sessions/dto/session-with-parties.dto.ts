import {
  ApiExtraModels,
  ApiProperty,
  getSchemaPath,
  PickType,
} from '@nestjs/swagger';
import { SessionDto } from './session.dto';

export class PartyMemberSession {
  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(SessionDto) },
  })
  memberSessions!: Record<string, SessionDto>;
}

@ApiExtraModels(PartyMemberSession)
export class SessionWithPartiesDto extends SessionDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(PartyMemberSession) },
  })
  parties!: Record<string, PartyMemberSession>;
}

export class SessionNotFoundWithPartiesDto extends PickType(
  SessionWithPartiesDto,
  ['parties'] as const,
) {}
