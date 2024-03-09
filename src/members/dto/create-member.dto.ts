import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMemberDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  inviteId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  memberNickname: string;
}
