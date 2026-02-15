import { DynamoDBItem, DailyMetrics, AggregatorEvent } from "./shared/types";
import {
  extractAppFromModelId,
  extractAppFromOwner,
  extractUserIdFromOwner,
  getRecordType,
  extractTimestamp,
} from "./shared/pattern-utils";
import { formatDate, getYesterday, isDateInRange } from "./shared/date-utils";

/**
 * Main aggregation engine that processes DynamoDB items and builds metrics by date and app
 */
export class MetricsAggregator {
  private metricsByDateAndApp: Map<string, Map<string, DailyMetrics>> = new Map();

  /**
   * Process a single DynamoDB item and update metrics
   */
  processItem(item: DynamoDBItem, event: AggregatorEvent): void {
    try {
      const modelId = item.modelId.S;
      const owner = item.owner.S;
      const recordType = getRecordType(modelId);

      if (!recordType) {
        return; // Skip unknown record types
      }

      // Extract timestamp based on record type
      const timestampStr = extractTimestamp(item);
      if (!timestampStr) {
        console.warn("Missing timestamp for record", { modelId, recordType });
        return;
      }

      const timestamp = new Date(timestampStr);
      const date = formatDate(timestamp);

      // Check if date should be included based on mode
      if (!this.shouldIncludeDate(date, event)) {
        return;
      }

      // Process based on record type
      if (recordType === "session") {
        this.processSessionRecord(modelId, owner, date);
      } else if (recordType === "party") {
        this.processPartyRecord(modelId, owner, date);
      } else if (recordType === "member") {
        this.processMemberRecord(modelId, owner, date);
      }
    } catch (error) {
      console.warn("Failed to process item", {
        modelId: item.modelId?.S,
        owner: item.owner?.S,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue processing other items
    }
  }

  /**
   * Process a session record (active users and games played)
   */
  private processSessionRecord(modelId: string, owner: string, date: string): void {
    const app = extractAppFromModelId(modelId);
    if (!app) {
      return;
    }

    const userId = extractUserIdFromOwner(owner);
    if (!userId) {
      return;
    }

    const metrics = this.getOrCreateMetrics(date, app);
    
    // Track active user
    metrics.activeUserIds.add(userId);
    
    // Track games played per user
    const currentCount = metrics.gamesPerUser.get(userId) || 0;
    metrics.gamesPerUser.set(userId, currentCount + 1);
  }

  /**
   * Process a party record (parties created)
   */
  private processPartyRecord(modelId: string, owner: string, date: string): void {
    const app = extractAppFromModelId(modelId);
    if (!app) {
      return;
    }

    const userId = extractUserIdFromOwner(owner);
    if (!userId) {
      return;
    }

    const metrics = this.getOrCreateMetrics(date, app);
    
    // Track parties created per user
    const currentCount = metrics.partiesCreatedPerUser.get(userId) || 0;
    metrics.partiesCreatedPerUser.set(userId, currentCount + 1);
  }

  /**
   * Process a member record (parties joined)
   */
  private processMemberRecord(modelId: string, owner: string, date: string): void {
    const app = extractAppFromOwner(owner);
    if (!app) {
      return;
    }

    const metrics = this.getOrCreateMetrics(date, app);
    
    // Track total parties joined
    metrics.partiesJoined++;
  }

  /**
   * Determine if a date should be included based on the aggregation mode
   */
  private shouldIncludeDate(date: string, event: AggregatorEvent): boolean {
    if (event.mode === "incremental") {
      // Only include yesterday
      const yesterday = getYesterday();
      return date === yesterday;
    } else {
      // Backfill mode: include all dates from backfillStartDate to yesterday
      if (!event.backfillStartDate) {
        throw new Error("backfillStartDate is required for backfill mode");
      }
      const yesterday = getYesterday();
      return isDateInRange(date, event.backfillStartDate, yesterday);
    }
  }

  /**
   * Get or create metrics for a specific date and app
   */
  private getOrCreateMetrics(date: string, app: string): DailyMetrics {
    let appMetrics = this.metricsByDateAndApp.get(date);
    
    if (!appMetrics) {
      appMetrics = new Map();
      this.metricsByDateAndApp.set(date, appMetrics);
    }

    let metrics = appMetrics.get(app);
    
    if (!metrics) {
      metrics = {
        date,
        app,
        activeUserIds: new Set(),
        gamesPerUser: new Map(),
        partiesCreatedPerUser: new Map(),
        partiesJoined: 0,
      };
      appMetrics.set(app, metrics);
    }

    return metrics;
  }

  /**
   * Get all aggregated metrics
   */
  getMetrics(): Map<string, Map<string, DailyMetrics>> {
    return this.metricsByDateAndApp;
  }

  /**
   * Get metrics for a specific date
   */
  getMetricsForDate(date: string): Map<string, DailyMetrics> | undefined {
    return this.metricsByDateAndApp.get(date);
  }

  /**
   * Get metrics for a specific date and app
   */
  getMetricsForDateAndApp(date: string, app: string): DailyMetrics | undefined {
    return this.metricsByDateAndApp.get(date)?.get(app);
  }

  /**
   * Get all dates that have metrics
   */
  getDates(): string[] {
    return Array.from(this.metricsByDateAndApp.keys()).sort();
  }

  /**
   * Get all apps for a specific date
   */
  getAppsForDate(date: string): string[] {
    const appMetrics = this.metricsByDateAndApp.get(date);
    return appMetrics ? Array.from(appMetrics.keys()).sort() : [];
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.metricsByDateAndApp.clear();
  }
}
