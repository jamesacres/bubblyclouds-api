import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Invite } from './invite';

export class InviteDto implements Invite {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  inviteId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sessionId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiProperty()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  expiresAt: Date;

  @ApiProperty()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  updatedAt: Date;
}
