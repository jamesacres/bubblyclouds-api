import {
  CloudWatchClient,
  PutMetricDataCommand,
  MetricDatum,
} from "@aws-sdk/client-cloudwatch";
import { DailyMetrics } from "./shared/types";

const cloudwatchClient = new CloudWatchClient({});

const NAMESPACE = "BubblyClouds/Analytics";

/**
 * Build CloudWatch metric data for a specific date and app
 */
export function buildMetricData(
  date: string,
  app: string,
  metrics: DailyMetrics,
): MetricDatum[] {
  // Parse date and set timestamp to midnight UTC
  const timestamp = new Date(`${date}T00:00:00.000Z`);

  // Calculate aggregate values
  const activeUsersCount = metrics.activeUserIds.size;
  const gamesPlayedCount = Array.from(metrics.gamesPerUser.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const partiesCreatedCount = Array.from(metrics.partiesCreatedPerUser.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  return [
    {
      MetricName: "ActiveUsers",
      Value: activeUsersCount,
      Timestamp: timestamp,
      Unit: "Count",
      Dimensions: [
        {
          Name: "App",
          Value: app,
        },
      ],
    },
    {
      MetricName: "GamesPlayed",
      Value: gamesPlayedCount,
      Timestamp: timestamp,
      Unit: "Count",
      Dimensions: [
        {
          Name: "App",
          Value: app,
        },
      ],
    },
    {
      MetricName: "PartiesCreated",
      Value: partiesCreatedCount,
      Timestamp: timestamp,
      Unit: "Count",
      Dimensions: [
        {
          Name: "App",
          Value: app,
        },
      ],
    },
    {
      MetricName: "PartiesJoined",
      Value: metrics.partiesJoined,
      Timestamp: timestamp,
      Unit: "Count",
      Dimensions: [
        {
          Name: "App",
          Value: app,
        },
      ],
    },
  ];
}

/**
 * Publish metrics to CloudWatch for a specific date and app
 */
export async function publishMetrics(
  date: string,
  app: string,
  metrics: DailyMetrics,
): Promise<void> {
  try {
    const metricData = buildMetricData(date, app, metrics);

    const command = new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: metricData,
    });

    await cloudwatchClient.send(command);

    console.log("Published CloudWatch metrics successfully", {
      date,
      app,
      metricCount: metricData.length,
    });
  } catch (error) {
    console.error("Failed to publish CloudWatch metrics", {
      date,
      app,
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - allow processing to continue for Analytics Table writes
  }
}

/**
 * Publish metrics for all dates and apps in the aggregated data
 */
export async function publishAllMetrics(
  metricsByDateAndApp: Map<string, Map<string, DailyMetrics>>,
): Promise<void> {
  const publishPromises: Promise<void>[] = [];

  for (const [date, appMetrics] of metricsByDateAndApp) {
    for (const [app, metrics] of appMetrics) {
      publishPromises.push(publishMetrics(date, app, metrics));
    }
  }

  await Promise.all(publishPromises);
}
