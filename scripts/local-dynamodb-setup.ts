/**
 * Creates the local DynamoDB table + ownerIndex GSI used by `npm run start:local`.
 *
 * Prereqs: local DynamoDB running (`npm run dynamodb:start`).
 *
 * Reuses the integration-test table schema so the local table matches what the
 * repositories expect. Reads API_TABLE / API_DB_ENDPOINT from the environment
 * (see .env), defaulting to the `Api` table on http://localhost:8000.
 *
 * Idempotent: creates the table if missing, otherwise clears it.
 */
import 'dotenv/config';

// Point the shared test setup at the `start:local` table (defaults match .env).
process.env.API_TABLE = process.env.API_TABLE || 'Api';
process.env.API_DB_ENDPOINT =
  process.env.API_DB_ENDPOINT || 'http://localhost:8000';

async function main() {
  const { setupDynamoDB } = await import(
    '../test/integration/setup/dynamodb'
  );
  await setupDynamoDB();
  console.info(
    `Local DynamoDB ready: table "${process.env.API_TABLE}" at ${process.env.API_DB_ENDPOINT}`,
  );
}

main().catch((err) => {
  console.error('Failed to set up local DynamoDB:', err);
  process.exit(1);
});
