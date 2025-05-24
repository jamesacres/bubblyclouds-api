import { Injectable, NotFoundException } from '@nestjs/common';
import { InvokeAgentDto } from './dto/invoke-agent.dto';
import { InvokeAgentResponseDto } from './dto/invoke-agent-response.dto';
import {
  BedrockAgentRuntimeClient,
  InvokeInlineAgentCommand,
  InvokeInlineAgentRequest,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { User } from '@/types/interfaces/user';
import { createHash } from 'crypto';

@Injectable()
export class AgentService {
  private client: BedrockAgentRuntimeClient;

  constructor() {
    this.client = new BedrockAgentRuntimeClient({ region: 'eu-west-2' });
  }
  async invoke(
    user: User,
    invokeAgentDto: InvokeAgentDto,
  ): Promise<InvokeAgentResponseDto> {
    console.info(invokeAgentDto);

    const sessionId = createHash('sha256').update(user.sub).digest('hex');
    const input: InvokeInlineAgentRequest = {
      sessionId,

      // https://aws.amazon.com/bedrock/pricing/
      // anthropic.claude-3-haiku-20240307-v1:0
      foundationModel: 'amazon.titan-text-express-v1',
      instruction: `You are a friendly assistant that is responsible for resolving user queries.
      
      You have access to search, cost tool and code interpreter.`,
      agentName: 'cost_agent',
      actionGroups: [
        {
          actionGroupName: 'actionGroupName',
          actionGroupExecutor: { customControl: 'RETURN_CONTROL' },
          apiSchema: undefined,
          functionSchema: {
            functions: [
              {
                name: 'functionName',
                parameters: { test: { type: 'string', required: true } },
                requireConfirmation: 'DISABLED',
              },
            ],
          },
        },
      ],
      inputText: invokeAgentDto.inputText,
    };
    const command = new InvokeInlineAgentCommand(input);

    try {
      let completion = '';
      const response = await this.client.send(command);

      if (response.completion === undefined) {
        throw new Error('Completion is undefined');
      }

      for await (const chunkEvent of response.completion) {
        const chunk = chunkEvent.chunk;
        if (chunk) {
          const decodedResponse = new TextDecoder('utf-8').decode(chunk.bytes);
          completion += decodedResponse;
        }
      }

      return { completion };
    } catch (err) {
      console.error(err);
    }

    throw new NotFoundException();
  }
}
