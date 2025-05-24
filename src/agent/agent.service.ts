import { Injectable } from '@nestjs/common';
import { InvokeAgentDto } from './dto/invoke-agent.dto';
import { InvokeAgentResponseDto } from './dto/invoke-agent-response.dto';

@Injectable()
export class AgentService {
  invoke(invokeAgentDto: InvokeAgentDto): InvokeAgentResponseDto {
    console.info(invokeAgentDto);
    return {};
  }
}
