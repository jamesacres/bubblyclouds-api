import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InvokeAgentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  inputText: string;
}
