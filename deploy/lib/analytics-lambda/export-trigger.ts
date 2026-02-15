import { DynamoDBClient, ExportTableToPointInTimeCommand } from "@aws-sdk/client-dynamodb";
import { ExportRequest } from "./shared/types";

const dynamoDBClient = new DynamoDBClient({});

interface Environment {
  TABLE_NAME: string;
  EXPORT_BUCKET: string;
  S3_PREFIX?: string;
}

function validateEnvironment(): Environment {
  const { TABLE_NAME, EXPORT_BUCKET, S3_PREFIX } = process.env;

  if (!TABLE_NAME) {
    throw new Error("TABLE_NAME environment variable is required");
  }

  if (!EXPORT_BUCKET) {
    throw new Error("EXPORT_BUCKET environment variable is required");
  }

  return {
    TABLE_NAME,
    EXPORT_BUCKET,
    S3_PREFIX: S3_PREFIX || "exports",
  };
}

function buildExportParams(event: ExportRequest, env: Environment) {
  const timestamp = Date.now();
  const s3Prefix = `${env.S3_PREFIX}/${timestamp}/`;

  const params: {
    TableArn: string;
    S3Bucket: string;
    S3Prefix: string;
    ExportFormat: "DYNAMODB_JSON";
    ExportType: "INCREMENTAL_EXPORT" | "FULL_EXPORT";
    IncrementalExportSpecification?: {
      ExportFromTime: Date;
      ExportToTime: Date;
    };
  } = {
    TableArn: env.TABLE_NAME,
    S3Bucket: env.EXPORT_BUCKET,
    S3Prefix: s3Prefix,
    ExportFormat: "DYNAMODB_JSON",
    ExportType: event.mode === "incremental" ? "INCREMENTAL_EXPORT" : "FULL_EXPORT",
  };

  if (event.mode === "incremental") {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    params.IncrementalExportSpecification = {
      ExportFromTime: yesterday,
      ExportToTime: today,
    };
  }

  return params;
}

export async function handler(event: ExportRequest): Promise<void> {
  try {
    const env = validateEnvironment();

    if (!event.mode || (event.mode !== "incremental" && event.mode !== "backfill")) {
      throw new Error('Invalid mode. Must be "incremental" or "backfill"');
    }

    if (event.mode === "backfill" && !event.backfillStartDate) {
      throw new Error("backfillStartDate is required for backfill mode");
    }

    const exportParams = buildExportParams(event, env);

    console.log("Initiating DynamoDB export", {
      mode: event.mode,
      tableArn: env.TABLE_NAME,
      bucket: env.EXPORT_BUCKET,
      prefix: exportParams.S3Prefix,
      exportType: exportParams.ExportType,
    });

    const command = new ExportTableToPointInTimeCommand(exportParams);
    const response = await dynamoDBClient.send(command);

    console.log("Export initiated successfully", {
      exportArn: response.ExportDescription?.ExportArn,
      exportStatus: response.ExportDescription?.ExportStatus,
    });
  } catch (error) {
    console.error("Export failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tableName: process.env.TABLE_NAME,
      bucket: process.env.EXPORT_BUCKET,
      mode: event.mode,
    });
    throw error;
  }
}
