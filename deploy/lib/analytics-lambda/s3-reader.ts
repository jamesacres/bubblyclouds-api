import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { createGunzip } from "zlib";
import { DynamoDBItem } from "./shared/types";

const s3Client = new S3Client({});

export interface ExportManifest {
  dataFiles: string[];
}

/**
 * Find the latest export prefix in the S3 bucket
 * Exports are stored with prefix pattern: exports/{timestamp}/
 */
export async function findLatestExport(
  bucketName: string,
  prefix: string = "exports/",
): Promise<string> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: "/",
    });

    const response = await s3Client.send(command);

    if (!response.CommonPrefixes || response.CommonPrefixes.length === 0) {
      throw new Error(`No exports found in bucket ${bucketName} with prefix ${prefix}`);
    }

    // Sort by prefix (timestamp) descending to get the latest
    const sortedPrefixes = response.CommonPrefixes
      .map((p: { Prefix?: string }) => p.Prefix!)
      .sort()
      .reverse();

    const latestPrefix = sortedPrefixes[0];
    console.log("Found latest export prefix:", latestPrefix);

    return latestPrefix;
  } catch (error) {
    console.error("Failed to find latest export", {
      bucket: bucketName,
      prefix,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Read and parse the export manifest file
 * The manifest contains the list of data files to process
 */
export async function readManifest(
  bucketName: string,
  exportPrefix: string,
): Promise<ExportManifest> {
  try {
    // Find the AWSDynamoDB subdirectory
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: exportPrefix,
      Delimiter: "/",
    });

    const listResponse = await s3Client.send(listCommand);
    const dynamoDBPrefix = listResponse.CommonPrefixes?.find((p: { Prefix?: string }) =>
      p.Prefix?.includes("AWSDynamoDB"),
    )?.Prefix;

    if (!dynamoDBPrefix) {
      throw new Error(`AWSDynamoDB directory not found in export ${exportPrefix}`);
    }

    // Find the export ID subdirectory
    const exportIdListCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: dynamoDBPrefix,
      Delimiter: "/",
    });

    const exportIdResponse = await s3Client.send(exportIdListCommand);
    const exportIdPrefix = exportIdResponse.CommonPrefixes?.[0]?.Prefix;

    if (!exportIdPrefix) {
      throw new Error(`Export ID directory not found in ${dynamoDBPrefix}`);
    }

    // Read manifest-files.json
    const manifestKey = `${exportIdPrefix}manifest-files.json`;
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: manifestKey,
    });

    const response = await s3Client.send(getCommand);
    const manifestContent = await streamToString(response.Body as Readable);

    // manifest-files.json is NDJSON: each line is a JSON object with a dataFileS3Key property
    const dataFiles = manifestContent
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
      .map((entry: { dataFileS3Key: string }) => entry.dataFileS3Key)
      .filter(Boolean);

    console.log("Read manifest successfully", {
      manifestKey,
      dataFileCount: dataFiles.length,
    });

    return { dataFiles };
  } catch (error) {
    console.error("Failed to read manifest", {
      bucket: bucketName,
      exportPrefix,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Read and parse a single data file from the export
 * Data files are gzipped JSON with one DynamoDB item per line
 */
export async function readDataFile(
  bucketName: string,
  dataFileKey: string,
): Promise<DynamoDBItem[]> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: dataFileKey,
    });

    const response = await s3Client.send(command);
    const body = response.Body as Readable;

    // Decompress gzipped content
    const gunzip = createGunzip();
    const decompressed = body.pipe(gunzip);

    const content = await streamToString(decompressed);

    // Parse newline-delimited JSON
    const items: DynamoDBItem[] = [];
    const lines = content.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        // DynamoDB export format wraps items in an "Item" property
        const item = parsed.Item || parsed;
        items.push(item);
      } catch (parseError) {
        console.warn("Failed to parse line in data file", {
          dataFileKey,
          line: line.substring(0, 100), // Log first 100 chars
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
        // Continue processing remaining lines
      }
    }

    console.log("Read data file successfully", {
      dataFileKey,
      itemCount: items.length,
    });

    return items;
  } catch (error) {
    console.error("Failed to read data file", {
      bucket: bucketName,
      dataFileKey,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Helper function to convert a stream to a string
 */
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Uint8Array[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}
