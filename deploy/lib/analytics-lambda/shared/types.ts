export interface DynamoDBItem {
  modelId: { S: string };
  owner: { S: string };
  updatedAt?: { N: string };
  createdAt?: { N: string };
}

export interface DailyMetrics {
  date: string;
  app: string;
  activeUserIds: Set<string>;
  gamesPerUser: Map<string, number>;
  partiesCreatedPerUser: Map<string, number>;
  partiesJoined: number;
}

export interface AggregatorEvent {
  mode: "incremental" | "backfill";
  backfillStartDate?: string;
}

export interface ExportRequest {
  mode: "incremental" | "backfill";
  backfillStartDate?: string;
}

export type RecordType = "session" | "party" | "member";
