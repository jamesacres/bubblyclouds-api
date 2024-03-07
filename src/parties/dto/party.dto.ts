import { ApiProperty } from '@nestjs/swagger';

export class PartyDto {
  @ApiProperty()
  partyId: string;

  @ApiProperty()
  partyType: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;
}
