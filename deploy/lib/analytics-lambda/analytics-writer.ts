import {
  DynamoDBClient,
  PutItemCommand,
  AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { DailyMetrics } from "./shared/types";

const dynamodbClient = new DynamoDBClient({});

// TTL duration: 455 days in seconds
const TTL_DAYS = 455;
const TTL_SECONDS = TTL_DAYS * 24 * 60 * 60;

/**
 * Build Analytics_Table record structure from DailyMetrics
 */
export function buildAnalyticsRecord(
  date: string,
  app: string,
  metrics: DailyMetrics,
): Record<string, AttributeValue> {
  // Calculate TTL: current time + 455 days
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;

  // Calculate summary values
  const activeUsersCount = metrics.activeUserIds.size;
  const gamesPlayedCount = Array.from(metrics.gamesPerUser.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const partiesCreatedCount = Array.from(metrics.partiesCreatedPerUser.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Convert Map to DynamoDB Map format
  const gamesPerUserMap: Record<string, AttributeValue> = {};
  for (const [userId, count] of metrics.gamesPerUser) {
    gamesPerUserMap[userId] = { N: count.toString() };
  }

  const partiesCreatedPerUserMap: Record<string, AttributeValue> = {};
  for (const [userId, count] of metrics.partiesCreatedPerUser) {
    partiesCreatedPerUserMap[userId] = { N: count.toString() };
  }

  const record: Record<string, AttributeValue> = {
    date: { S: date },
    app: { S: app },
    gamesPerUser: { M: gamesPerUserMap },
    partiesCreatedPerUser: { M: partiesCreatedPerUserMap },
    partiesJoined: { N: metrics.partiesJoined.toString() },
    summary: {
      M: {
        activeUsers: { N: activeUsersCount.toString() },
        gamesPlayed: { N: gamesPlayedCount.toString() },
        partiesCreated: { N: partiesCreatedCount.toString() },
        partiesJoined: { N: metrics.partiesJoined.toString() },
      },
    },
    expiresAt: { N: expiresAt.toString() },
  };

  // Only include activeUserIds if non-empty (DynamoDB rejects empty String Sets)
  if (metrics.activeUserIds.size > 0) {
    record.activeUserIds = { SS: Array.from(metrics.activeUserIds) };
  }

  return record;
}

/**
 * Calculate TTL timestamp (current time + 455 days)
 */
export function calculateTTL(): number {
  return Math.floor(Date.now() / 1000) + TTL_SECONDS;
}

/**
 * Write a single analytics record to DynamoDB
 */
export async function writeAnalyticsRecord(
  tableName: string,
  date: string,
  app: string,
  metrics: DailyMetrics,
): Promise<void> {
  try {
    const item = buildAnalyticsRecord(date, app, metrics);

    const command = new PutItemCommand({
      TableName: tableName,
      Item: item,
    });

    await dynamodbClient.send(command);

    console.log("Wrote Analytics_Table record successfully", {
      date,
      app,
      activeUsers: metrics.activeUserIds.size,
      gamesPlayed: Array.from(metrics.gamesPerUser.values()).reduce(
        (sum, count) => sum + count,
        0,
      ),
    });
  } catch (error) {
    console.error("Failed to write Analytics_Table record", {
      date,
      app,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - log error and continue processing other records
  }
}

/**
 * Write all analytics records for all dates and apps
 */
export async function writeAllAnalyticsRecords(
  tableName: string,
  metricsByDateAndApp: Map<string, Map<string, DailyMetrics>>,
): Promise<void> {
  const writePromises: Promise<void>[] = [];

  for (const [date, appMetrics] of metricsByDateAndApp) {
    for (const [app, metrics] of appMetrics) {
      writePromises.push(writeAnalyticsRecord(tableName, date, app, metrics));
    }
  }

  await Promise.all(writePromises);
}
