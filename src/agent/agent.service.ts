import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InvokeAgentDto } from './dto/invoke-agent.dto';
import { InvokeAgentResponseDto } from './dto/invoke-agent-response.dto';
import {
  AgentActionGroup,
  BedrockAgentRuntimeClient,
  FunctionDefinition,
  FunctionInvocationInput,
  InvocationResultMember,
  InvokeInlineAgentCommand,
  InvokeInlineAgentCommandOutput,
  InvokeInlineAgentRequest,
  ParameterDetail,
  ParameterType,
  ThrottlingException,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { User } from '@/types/interfaces/user';
import { createHash } from 'crypto';
import { LocalMcpService } from './local-mcp.service';
import { constants } from 'http2';

interface McpClientConfig {
  name: string;
  description: string;
  client: Client;
  tools: Map<string, Tool>;
}

interface AgentResponse {
  completion?: string;
  returnControl?: {
    invocationId: string;
    results: InvocationResultMember[];
  };
}

@Injectable()
export class AgentService {
  private bedrockClient: BedrockAgentRuntimeClient;
  private _mcpClients: Map<string, McpClientConfig>;

  constructor() {
    this.bedrockClient = new BedrockAgentRuntimeClient({
      // region: 'eu-west-2',
      // Cross region inference
      // https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html
      // https://aws.amazon.com/blogs/machine-learning/enable-amazon-bedrock-cross-region-inference-in-multi-account-environments/
      region: 'eu-west-1',
    });
  }

  async invoke(
    user: User,
    invokeAgentDto: InvokeAgentDto,
  ): Promise<InvokeAgentResponseDto> {
    try {
      console.info(invokeAgentDto);

      const sessionId = `${createHash('sha256').update(user.sub).digest('hex')}-${invokeAgentDto.sessionId}`;

      const actionGroups = this.convertMcpToolsToBedrockSchema(
        await this.getMcpClients(),
      );
      console.info(JSON.stringify(actionGroups));

      let lastResult: AgentResponse | undefined;
      while (!lastResult || lastResult.returnControl) {
        const input: InvokeInlineAgentRequest = {
          sessionId,

          // https://aws.amazon.com/bedrock/pricing/
          // foundationModel: 'amazon.titan-text-express-v1',
          // foundationModel: 'anthropic.claude-3-haiku-20240307-v1:0',
          // Cross region inference, in eu-west-1 region above
          foundationModel: 'eu.anthropic.claude-3-haiku-20240307-v1:0',

          instruction: `You are a friendly assistant that is responsible for resolving user queries.
          Wherever possible, take advantage of the tools available to you to help users.
          You have access to bubbly clouds tools to find a magic number, calculate the sum of two numbers, and fetch user data and should make use of these to answer.`,

          agentName: 'bubblyclouds_agent',
          actionGroups,
          inputText: invokeAgentDto.inputText,
          inlineSessionState: lastResult?.returnControl
            ? {
                invocationId: lastResult.returnControl.invocationId,
                returnControlInvocationResults:
                  lastResult.returnControl.results,
              }
            : undefined,
        };
        const command = new InvokeInlineAgentCommand(input);

        console.info('invoking inline agent');
        const response = await this.bedrockClient.send(command);
        lastResult = await this.processAgentResponse(user, response);
      }

      if (lastResult?.completion) {
        return { completion: lastResult?.completion };
      }
      console.error('no completion in result');
    } catch (err) {
      console.error(err);
      if (err instanceof ThrottlingException) {
        throw new HttpException(
          'Ratelimited',
          constants.HTTP_STATUS_TOO_MANY_REQUESTS,
        );
      }
    }
    throw new InternalServerErrorException();
  }

  private async processAgentResponse(
    user: User,
    response: InvokeInlineAgentCommandOutput,
  ): Promise<AgentResponse> {
    const result: AgentResponse = {};
    if (response.completion) {
      for await (const event of response.completion) {
        if (event.chunk?.bytes) {
          console.info('appending completion text');
          // The final completion text to return to the user
          const chunkText = new TextDecoder().decode(event.chunk.bytes);
          result.completion = `${result.completion || ''}${chunkText}`;
        }

        if (
          event.returnControl &&
          event.returnControl.invocationId &&
          event.returnControl.invocationInputs
        ) {
          console.info(
            'handle returnControl invocationId',
            event.returnControl.invocationId,
          );
          // We need to execute our tool then invoke the AI again with the result
          result.returnControl = {
            invocationId: event.returnControl.invocationId,
            results: [],
          };
          for (const invocationInput of event.returnControl.invocationInputs) {
            if (invocationInput.functionInvocationInput) {
              console.info(
                'handle returnControl actionGroup',
                invocationInput.functionInvocationInput.actionGroup,
              );
              // Execute tool
              const toolResponseBody = await this.handleReturnControl(
                user,
                await this.getMcpClients(),
                invocationInput.functionInvocationInput,
              ).catch((e: any) => {
                console.error(e);
                return 'Error';
              });
              console.info('toolResponseBody', toolResponseBody);
              result.returnControl.results.push({
                functionResult: {
                  actionGroup:
                    invocationInput.functionInvocationInput['actionGroup'],
                  agentId: invocationInput.functionInvocationInput['agentId'],
                  function: invocationInput.functionInvocationInput['function'],
                  responseBody: {
                    TEXT: { body: toolResponseBody || 'No response' },
                  },
                },
              });
            }
          }
        }
      }
    }

    return result;
  }

  private async handleReturnControl(
    user: User,
    mcpClients: Map<string, McpClientConfig>,
    input: FunctionInvocationInput,
  ): Promise<string | void> {
    console.info('handleReturnControl', input);
    if (
      input.actionGroup &&
      input.function &&
      mcpClients.has(input.actionGroup)
    ) {
      const mcpClient = mcpClients.get(input.actionGroup);
      if (mcpClient?.tools.has(input.function)) {
        console.info(
          'handleReturnControl callTool',
          input.actionGroup,
          input.function,
        );
        const result = await mcpClient.client.callTool({
          name: input.function,
          arguments: {
            ...(input.parameters
              ? input.parameters?.reduce(
                  (result: Record<string, unknown>, { name, value }) => {
                    return name
                      ? {
                          ...result,
                          [name]: value,
                        }
                      : result;
                  },
                  {},
                )
              : undefined),
            // System overriden parameters
            user,
          },
        });
        console.info('handleReturnControl result', result);
        const content: { type: string; text: string }[] = result.content as any;
        const combinedResult = content.reduce(
          (result, part) => `${result}${part.text}`,
          '',
        );
        console.info('handleReturnControl combinedResult', combinedResult);
        return combinedResult;
      }
    }
    throw Error('handleReturnControl unhandled');
  }

  private async getMcpClients() {
    if (!this._mcpClients) {
      this._mcpClients = new Map();
      this._mcpClients.set('bubblyclouds', await this.connectLocalMcpService());
    }
    return this._mcpClients;
  }

  private async connectLocalMcpService(): Promise<McpClientConfig> {
    const localMcpService = new LocalMcpService();
    await localMcpService.connectServer();

    const clientConfig: McpClientConfig = {
      client: await localMcpService.getClient(),
      name: 'bubblyclouds',
      description: 'services provided by Bubbly Clouds',
      tools: new Map(),
    };

    console.info('listing local mcp tools');
    for (const tool of (await clientConfig.client.listTools()).tools) {
      clientConfig.tools.set(tool.name, tool);
    }
    return clientConfig;
  }

  private convertMcpToolsToBedrockSchema(
    mcpClients: Map<string, McpClientConfig>,
  ): AgentActionGroup[] {
    const actionGroups: AgentActionGroup[] = [];

    // Each MCP client is an actionGroup with one or more tools
    for (const [serverName, config] of mcpClients.entries()) {
      const functions: FunctionDefinition[] = [];
      for (const tool of config.tools.values()) {
        const parameters: Record<string, ParameterDetail> = {};
        if (tool.inputSchema?.properties) {
          for (const [paramName, paramProperties] of Object.entries(
            <
              {
                [key: string]: {
                  type: ParameterType;
                  description?: string;
                };
              }
            >tool.inputSchema.properties,
          )) {
            parameters[paramName] = {
              type: paramProperties.type || 'string',
              description: paramProperties.description || paramName,
              required: tool.inputSchema.required?.includes(paramName),
            };
          }
        }
        functions.push({
          parameters: Object.keys(parameters).length ? parameters : undefined,
          name: tool.name,
          description: tool.description || tool.name,
          requireConfirmation: 'DISABLED',
        });
      }
      actionGroups.push({
        actionGroupName: serverName,
        actionGroupExecutor: {
          customControl: 'RETURN_CONTROL',
        },
        description: config.description,
        functionSchema: {
          functions,
        },
      });
    }

    return actionGroups;
  }
}
