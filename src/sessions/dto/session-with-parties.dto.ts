import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { SessionDto } from './session.dto';

class PartySession {
  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(SessionDto) },
  })
  members: Record<string, SessionDto>;
}
@ApiExtraModels(PartySession)
export class SessionWithPartiesDto extends SessionDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(PartySession) },
  })
  parties: Record<string, PartySession>;
}
