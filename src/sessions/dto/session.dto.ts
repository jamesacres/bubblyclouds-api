import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsObject, IsString } from 'class-validator';

export class SessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsObject()
  @IsNotEmpty()
  state: object;

  @ApiProperty()
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @IsDate()
  updatedAt: Date;
}
