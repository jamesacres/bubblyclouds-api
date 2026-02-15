import { buildAnalyticsRecord, calculateTTL } from "./analytics-writer";
import { DailyMetrics } from "./shared/types";

describe("analytics-writer", () => {
  describe("buildAnalyticsRecord", () => {
    it("should build correct record structure with all required attributes", () => {
      const date = "2025-01-20";
      const app = "sudoku";
      const metrics: DailyMetrics = {
        date,
        app,
        activeUserIds: new Set(["user1", "user2", "user3"]),
        gamesPerUser: new Map([
          ["user1", 5],
          ["user2", 3],
          ["user3", 2],
        ]),
        partiesCreatedPerUser: new Map([
          ["user1", 2],
          ["user2", 1],
        ]),
        partiesJoined: 7,
      };

      const record = buildAnalyticsRecord(date, app, metrics);

      // Verify partition key and sort key
      expect(record.date).toEqual({ S: "2025-01-20" });
      expect(record.app).toEqual({ S: "sudoku" });

      // Verify activeUserIds (String Set)
      expect(record.activeUserIds.SS).toHaveLength(3);
      expect(record.activeUserIds.SS).toContain("user1");
      expect(record.activeUserIds.SS).toContain("user2");
      expect(record.activeUserIds.SS).toContain("user3");

      // Verify gamesPerUser (Map)
      expect(record.gamesPerUser.M).toBeDefined();
      expect(record.gamesPerUser.M!["user1"]).toEqual({ N: "5" });
      expect(record.gamesPerUser.M!["user2"]).toEqual({ N: "3" });
      expect(record.gamesPerUser.M!["user3"]).toEqual({ N: "2" });

      // Verify partiesCreatedPerUser (Map)
      expect(record.partiesCreatedPerUser.M).toBeDefined();
      expect(record.partiesCreatedPerUser.M!["user1"]).toEqual({ N: "2" });
      expect(record.partiesCreatedPerUser.M!["user2"]).toEqual({ N: "1" });

      // Verify partiesJoined (Number)
      expect(record.partiesJoined).toEqual({ N: "7" });

      // Verify summary (Map with aggregate totals)
      expect(record.summary.M).toBeDefined();
      expect(record.summary.M!.activeUsers).toEqual({ N: "3" });
      expect(record.summary.M!.gamesPlayed).toEqual({ N: "10" }); // 5 + 3 + 2
      expect(record.summary.M!.partiesCreated).toEqual({ N: "3" }); // 2 + 1
      expect(record.summary.M!.partiesJoined).toEqual({ N: "7" });

      // Verify expiresAt (TTL attribute)
      expect(record.expiresAt.N).toBeDefined();
      const expiresAt = parseInt(record.expiresAt.N!);
      const now = Math.floor(Date.now() / 1000);
      const ttlDays = 455;
      const expectedTTL = now + ttlDays * 24 * 60 * 60;
      // Allow 5 second tolerance for test execution time
      expect(expiresAt).toBeGreaterThanOrEqual(expectedTTL - 5);
      expect(expiresAt).toBeLessThanOrEqual(expectedTTL + 5);
    });

    it("should handle empty metrics correctly", () => {
      const date = "2025-01-20";
      const app = "sudoku";
      const metrics: DailyMetrics = {
        date,
        app,
        activeUserIds: new Set(),
        gamesPerUser: new Map(),
        partiesCreatedPerUser: new Map(),
        partiesJoined: 0,
      };

      const record = buildAnalyticsRecord(date, app, metrics);

      // Verify empty collections are handled correctly
      // activeUserIds should be omitted when empty (DynamoDB rejects empty String Sets)
      expect(record.activeUserIds).toBeUndefined();
      expect(record.gamesPerUser.M).toEqual({});
      expect(record.partiesCreatedPerUser.M).toEqual({});
      expect(record.partiesJoined).toEqual({ N: "0" });

      // Verify summary with zero values
      expect(record.summary.M!.activeUsers).toEqual({ N: "0" });
      expect(record.summary.M!.gamesPlayed).toEqual({ N: "0" });
      expect(record.summary.M!.partiesCreated).toEqual({ N: "0" });
      expect(record.summary.M!.partiesJoined).toEqual({ N: "0" });
    });

    it("should handle single user metrics", () => {
      const date = "2025-01-20";
      const app = "sudoku";
      const metrics: DailyMetrics = {
        date,
        app,
        activeUserIds: new Set(["user1"]),
        gamesPerUser: new Map([["user1", 1]]),
        partiesCreatedPerUser: new Map([["user1", 1]]),
        partiesJoined: 1,
      };

      const record = buildAnalyticsRecord(date, app, metrics);

      expect(record.activeUserIds.SS).toEqual(["user1"]);
      expect(record.gamesPerUser.M!["user1"]).toEqual({ N: "1" });
      expect(record.partiesCreatedPerUser.M!["user1"]).toEqual({ N: "1" });
      expect(record.summary.M!.activeUsers).toEqual({ N: "1" });
      expect(record.summary.M!.gamesPlayed).toEqual({ N: "1" });
      expect(record.summary.M!.partiesCreated).toEqual({ N: "1" });
    });
  });

  describe("calculateTTL", () => {
    it("should calculate TTL as 455 days from now", () => {
      const ttl = calculateTTL();
      const now = Math.floor(Date.now() / 1000);
      const ttlDays = 455;
      const expectedTTL = now + ttlDays * 24 * 60 * 60;

      // Allow 5 second tolerance for test execution time
      expect(ttl).toBeGreaterThanOrEqual(expectedTTL - 5);
      expect(ttl).toBeLessThanOrEqual(expectedTTL + 5);
    });

    it("should return a Unix timestamp in seconds", () => {
      const ttl = calculateTTL();
      
      // Unix timestamp should be a positive integer
      expect(ttl).toBeGreaterThan(0);
      expect(Number.isInteger(ttl)).toBe(true);
      
      // Should be in the future
      const now = Math.floor(Date.now() / 1000);
      expect(ttl).toBeGreaterThan(now);
    });
  });
});
