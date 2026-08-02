import { Test, TestingModule } from '@nestjs/testing';
import { Provider, Type } from '@nestjs/common';
import { DynamoDBModule } from '@/dynamodb/dynamodb.module';
import { AWS_REGION, DYNAMODB_ENDPOINT, TEST_TABLE_NAME } from './config';

/**
 * Builds a NestJS testing module wired to the real DynamoDBAdapterFactory
 * pointing at local DynamoDB. Pass the repositories/services you want to
 * exercise; they will be constructed with real dependencies.
 */
export const createIntegrationModule = async (
  providers: Provider[],
): Promise<TestingModule> => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      DynamoDBModule.forRoot({
        clientConfig: {
          region: AWS_REGION,
          endpoint: DYNAMODB_ENDPOINT,
          credentials: {
            accessKeyId: 'local',
            secretAccessKey: 'local',
          },
        },
        tableName: TEST_TABLE_NAME,
      }),
    ],
    providers,
  }).compile();

  return moduleRef;
};

export const getProvider = <T>(moduleRef: TestingModule, token: Type<T>): T =>
  moduleRef.get<T>(token);
