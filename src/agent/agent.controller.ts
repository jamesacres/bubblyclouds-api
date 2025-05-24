import { Controller, Post, Body } from '@nestjs/common';
import { AgentService } from './agent.service';
import { InvokeAgentDto } from './dto/invoke-agent.dto';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InvokeAgentResponseDto } from './dto/invoke-agent-response.dto';

@ApiTags('agent')
@ApiBearerAuth('access-token')
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @ApiOkResponse({
    description: 'Invoke agent response.',
    type: [InvokeAgentResponseDto],
  })
  @Post('invoke')
  invoke(@Body() invokeAgentDto: InvokeAgentDto) {
    return this.agentService.invoke(invokeAgentDto);
  }
}
