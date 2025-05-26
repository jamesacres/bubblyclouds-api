import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Injectable } from '@nestjs/common';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { User } from '@/types/interfaces/user';

const NAME = 'bubblyclouds';
const VERSION = '0.1.0';

@Injectable()
export class LocalMcpService {
  private client: Client;
  private server: Server;
  private clientTransport: Transport;
  private serverTransport: Transport;

  constructor() {
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    this.clientTransport = clientTransport;
    this.serverTransport = serverTransport;
  }

  public async getClient() {
    if (!this.client) {
      console.info('connect local mcp client');

      this.client = new Client(
        {
          name: `${NAME}-client`,
          version: VERSION,
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {},
          },
        },
      );

      await this.client.connect(this.clientTransport);
      console.info('local mcp client connected');
    }
    return this.client;
  }

  public async closeServer() {
    console.info('close local mcp server');
    await this.server.close();
  }

  public async connectServer() {
    console.info('connect local mcp server');
    if (this.server) {
      return;
    }

    this.server = new Server(
      {
        name: NAME,
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Register tools that call your JavaScript functions
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.info('handle list tools');
      return {
        tools: [
          {
            name: 'calculate_sum',
            description: 'Calculate the sum of two numbers',
            inputSchema: {
              type: 'object',
              properties: {
                a: {
                  type: 'number',
                  description: 'First number',
                },
                b: {
                  type: 'number',
                  description: 'Second number',
                },
              },
              required: ['a', 'b'],
            },
          },
          {
            name: 'secret_number',
            description: 'Find the secret number',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'fetch_user_data',
            description: 'Fetch user data',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      };
    });

    // Handle tool calls by routing to your JavaScript functions
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.info('handle tool', name, args);

      try {
        switch (name) {
          case 'calculate_sum': {
            if (!(args?.a && args?.b)) {
              throw new Error(`Missing args`);
            }
            const result = this.calculateSum(<number>args.a, <number>args.b);
            return {
              content: [
                {
                  type: 'text',
                  text: `${result}`,
                },
              ],
            };
          }

          case 'secret_number': {
            const result = this.secretNumber();
            return {
              content: [
                {
                  type: 'text',
                  text: `${result}`,
                },
              ],
            };
          }

          case 'fetch_user_data': {
            if (!args?.user) {
              throw new Error(`Missing args`);
            }
            const userData = await this.fetchUserData(<User>args.user);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(userData, null, 2),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    await this.server.connect(this.serverTransport);
    console.info('local mcp server connected');
  }

  private calculateSum(a: number, b: number) {
    console.info('calculateSum', a, b);
    return a + b;
  }

  private secretNumber() {
    console.info('secretNumber');
    return 9001;
  }

  private async fetchUserData(user: User) {
    // Simulate async operation
    console.info('example action on behalf of user', user.sub);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          name: 'Example Name',
        });
      }, 100);
    });
  }
}
