import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamicModule, FactoryProvider, Module } from '@nestjs/common';
import {
  ConfigurableModuleClass,
  OPTIONS_TYPE,
} from './dynamodb.module-definition';
import { DynamoDBAdapterFactory } from './dynamodb-adapter.factory';

@Module({})
export class DynamoDBModule extends ConfigurableModuleClass {
  static forRoot(options: typeof OPTIONS_TYPE): DynamicModule {
    const definition = super.forRoot(options);

    const dynamoDBAdapterFactoryProvider: FactoryProvider<DynamoDBAdapterFactory> =
      {
        provide: DynamoDBAdapterFactory,
        useFactory: () => {
          const dynamoDBDocumentClient = DynamoDBDocumentClient.from(
            new DynamoDBClient(options.clientConfig),
            {
              marshallOptions: {
                removeUndefinedValues: true,
              },
            },
          );
          return new DynamoDBAdapterFactory(
            dynamoDBDocumentClient,
            options.tableName,
          );
        },
      };

    return {
      ...definition,
      providers: [dynamoDBAdapterFactoryProvider],
      exports: [DynamoDBAdapterFactory],
    };
  }
}
