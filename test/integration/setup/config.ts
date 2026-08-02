/**
 * Shared configuration for DynamoDB integration and e2e tests.
 *
 * These tests run against a local DynamoDB instance, e.g.
 *   docker run -p 8000:8000 amazon/dynamodb-local
 * or via `npm run dynamodb:start`.
 */
export const DYNAMODB_ENDPOINT =
  process.env.API_DB_ENDPOINT || 'http://localhost:8000';
export const AWS_REGION = 'eu-west-2';
export const TEST_TABLE_NAME = process.env.API_TABLE || 'ApiIntegrationTest';

// Credentials are ignored by DynamoDB Local but the SDK requires them to be set.
export const TEST_AWS_CREDENTIALS = {
  accessKeyId: 'local',
  secretAccessKey: 'local',
};
