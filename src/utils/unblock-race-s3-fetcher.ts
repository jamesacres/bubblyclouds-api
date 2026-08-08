import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { RangeFetcher } from './unblock-race-reader';

/**
 * Builds a RangeFetcher backed by S3 ranged GetObject requests, so the RUSH3
 * puzzle database can be read a block at a time instead of being downloaded or
 * bundled into the Lambda package.
 */

let cachedClient: S3Client | undefined;

/** Reused across warm Lambda invocations. */
function s3Client(): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({ region: process.env.AWS_REGION });
  }
  return cachedClient;
}

export function createS3RangeFetcher(
  bucket: string,
  key: string,
  client: S3Client = s3Client(),
): RangeFetcher {
  return async (start: number, length: number): Promise<Buffer> => {
    // HTTP byte ranges are inclusive at both ends.
    const { Body } = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: `bytes=${start}-${start + length - 1}`,
      }),
    );

    if (!Body) {
      throw new Error(`Empty response for s3://${bucket}/${key} at ${start}`);
    }

    return Buffer.from(await Body.transformToByteArray());
  };
}
