import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  updatedAt: Date;
}
