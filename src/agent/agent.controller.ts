import { Controller, Post, Body, Request, HttpCode } from '@nestjs/common';
import { AgentService } from './agent.service';
import { InvokeAgentDto } from './dto/invoke-agent.dto';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { InvokeAgentResponseDto } from './dto/invoke-agent-response.dto';
import { RequestWithUser } from '@/types/interfaces/requestWithUser';
import { constants } from 'http2';

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
  @HttpCode(constants.HTTP_STATUS_OK)
  invoke(
    @Request() req: RequestWithUser,
    @Body() invokeAgentDto: InvokeAgentDto,
  ) {
    return this.agentService.invoke(req.user, invokeAgentDto);
  }
}
