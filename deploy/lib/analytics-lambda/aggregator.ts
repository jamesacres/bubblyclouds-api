import { AggregatorEvent } from "./shared/types";
import { findLatestExport, readManifest, readDataFile } from "./s3-reader";
import { MetricsAggregator } from "./aggregator-core";
import { publishAllMetrics } from "./cloudwatch-publisher";
import { writeAllAnalyticsRecords } from "./analytics-writer";

/**
 * Environment variable validation
 */
function validateEnvironment(): void {
  const required = ["EXPORT_BUCKET", "ANALYTICS_TABLE"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

/**
 * Validate event parameters
 */
function validateEvent(event: AggregatorEvent): void {
  if (!event.mode || !["incremental", "backfill"].includes(event.mode)) {
    throw new Error(
      `Invalid mode: ${event.mode}. Must be "incremental" or "backfill"`,
    );
  }

  if (event.mode === "backfill" && !event.backfillStartDate) {
    throw new Error("backfillStartDate is required for backfill mode");
  }

  if (event.backfillStartDate) {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(event.backfillStartDate)) {
      throw new Error(
        `Invalid backfillStartDate format: ${event.backfillStartDate}. Expected YYYY-MM-DD`,
      );
    }
  }
}

/**
 * Main Lambda handler for the Aggregator function
 */
export async function handler(event: AggregatorEvent): Promise<void> {
  console.log("Aggregator Lambda started", {
    mode: event.mode,
    backfillStartDate: event.backfillStartDate,
  });

  try {
    // Validate environment and event
    validateEnvironment();
    validateEvent(event);

    const bucketName = process.env.EXPORT_BUCKET!;
    const analyticsTableName = process.env.ANALYTICS_TABLE!;
    const s3Prefix = process.env.S3_PREFIX || "exports/";

    // Step 1: Find the latest export in S3
    console.log("Finding latest export...");
    const exportPrefix = await findLatestExport(bucketName, s3Prefix);

    // Step 2: Read the export manifest
    console.log("Reading export manifest...");
    const manifest = await readManifest(bucketName, exportPrefix);
    console.log(`Found ${manifest.dataFiles.length} data files to process`);

    // Step 3: Process all data files and aggregate metrics
    console.log("Processing data files...");
    const aggregator = new MetricsAggregator();
    let totalItemsProcessed = 0;

    for (const dataFileKey of manifest.dataFiles) {
      const items = await readDataFile(bucketName, dataFileKey);
      
      for (const item of items) {
        aggregator.processItem(item, event);
        totalItemsProcessed++;
      }

      // Log progress periodically
      if (totalItemsProcessed % 1000 === 0) {
        console.log(`Processed ${totalItemsProcessed} items so far...`);
      }
    }

    console.log(`Finished processing ${totalItemsProcessed} items`);

    // Step 4: Get aggregated metrics
    const metricsByDateAndApp = aggregator.getMetrics();
    const dates = aggregator.getDates();
    
    console.log("Aggregation complete", {
      totalDates: dates.length,
      dates: dates,
      totalRecords: Array.from(metricsByDateAndApp.values()).reduce(
        (sum, appMetrics) => sum + appMetrics.size,
        0,
      ),
    });

    // Step 5: Publish metrics to CloudWatch
    console.log("Publishing metrics to CloudWatch...");
    await publishAllMetrics(metricsByDateAndApp);

    // Step 6: Write records to Analytics Table
    console.log("Writing records to Analytics Table...");
    await writeAllAnalyticsRecords(analyticsTableName, metricsByDateAndApp);

    console.log("Aggregator Lambda completed successfully", {
      mode: event.mode,
      itemsProcessed: totalItemsProcessed,
      datesProcessed: dates.length,
      recordsWritten: Array.from(metricsByDateAndApp.values()).reduce(
        (sum, appMetrics) => sum + appMetrics.size,
        0,
      ),
    });
  } catch (error) {
    console.error("Aggregator Lambda failed", {
      mode: event.mode,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
