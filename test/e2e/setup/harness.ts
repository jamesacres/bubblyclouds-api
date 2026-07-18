/**
 * Shared e2e harness: boots the full Nest app over HTTP against local DynamoDB
 * and manages the table lifecycle. Each e2e spec provides its own top-level
 * `jest.mock(...)` calls (see setup/mocks.ts for the shared factories) because
 * jest module mocks are scoped per test file.
 */
import { INestApplication } from '@nestjs/common';
import {
  TEST_TABLE_NAME,
  DYNAMODB_ENDPOINT,
} from '../../integration/setup/config';

// Env must be set before the app module is imported (AppModule reads
// process.env at import time for the DynamoDB client config).
process.env.API_TABLE = TEST_TABLE_NAME;
process.env.API_DB_ENDPOINT = DYNAMODB_ENDPOINT;
process.env.AWS_ACCESS_KEY_ID = 'local';
process.env.AWS_SECRET_ACCESS_KEY = 'local';
process.env.AWS_REGION = 'eu-west-2';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');

import {
  setupDynamoDB,
  teardownDynamoDB,
  clearTable,
} from '../../integration/setup/dynamodb';

export { bearer } from './auth';
export { clearTable };

let app: INestApplication | undefined;

/**
 * Boots the full application exactly as production does (via build()) and
 * ensures the DynamoDB table exists. Returns the http server for supertest.
 */
export const startE2E = async (): Promise<import('http').Server> => {
  await setupDynamoDB();
  // Imported lazily so the per-spec jest.mock(...) calls are registered first.
  const { build } = await import('@/app.build');
  const expressApp = express();
  app = await build(expressApp);
  await app.init();
  return app.getHttpServer();
};

export const stopE2E = async (): Promise<void> => {
  await app?.close();
  app = undefined;
  await teardownDynamoDB();
};
