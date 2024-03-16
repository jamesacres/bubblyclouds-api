import { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { ConfigurableModuleBuilder } from '@nestjs/common';

export const { ConfigurableModuleClass, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<{
    clientConfig: DynamoDBClientConfig;
    tableName: string;
  }>()
    .setExtras({ isGlobal: true }, (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
    }))
    .setClassMethodName('forRoot')
    .build();
