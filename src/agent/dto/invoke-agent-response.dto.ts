import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InvokeAgentResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  completion: string;
}
