import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePartyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  partyName: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  maxSize?: number;
}
