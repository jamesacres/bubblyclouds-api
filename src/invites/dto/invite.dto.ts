import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  redirectUri?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiPropertyOptional()
  @IsOptional()
  // DatePipe transforms string to date
  @IsDate()
  expiresAt?: Date;

  @ApiProperty()
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @IsDate()
  updatedAt: Date;
}
