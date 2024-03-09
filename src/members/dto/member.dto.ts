import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class MemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  resourceId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  memberNickname: string;

  @ApiProperty()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  createdAt: Date;

  @ApiProperty()
  @Transform(({ value }) => value && new Date(value))
  @IsDate()
  updatedAt: Date;
}
