import { App } from '@/types/enums/app.enum';
import { EntitlementDuration } from '@/types/enums/entitlement-duration.enum';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class PartyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  partyId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  appId!: App;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  partyName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  createdBy!: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  maxSize?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  entitlementDuration?: EntitlementDuration;

  @ApiProperty()
  @IsDate()
  createdAt!: Date;

  @ApiProperty()
  @IsDate()
  updatedAt!: Date;
}
