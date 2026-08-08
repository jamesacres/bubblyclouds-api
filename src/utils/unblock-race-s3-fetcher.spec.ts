import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createS3RangeFetcher } from './unblock-race-s3-fetcher';

describe('createS3RangeFetcher', () => {
  const bodyFor = (bytes: number[]) => ({
    transformToByteArray: jest.fn().mockResolvedValue(Uint8Array.from(bytes)),
  });

  const clientWith = (body: unknown) =>
    ({
      send: jest.fn().mockResolvedValue({ Body: body }),
    }) as unknown as S3Client & {
      send: jest.Mock;
    };

  it('requests an inclusive byte range for the given offset and length', async () => {
    const client = clientWith(bodyFor([1, 2, 3, 4]));
    const fetch = createS3RangeFetcher(
      'my-bucket',
      'unblock-race/puzzles.bin',
      client,
    );

    await fetch(0, 4096);

    const command = client.send.mock.calls[0][0] as GetObjectCommand;
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: 'my-bucket',
      Key: 'unblock-race/puzzles.bin',
      // 4096 bytes from 0 is 0-4095, not 0-4096.
      Range: 'bytes=0-4095',
    });
  });

  it('offsets the range when reading from the middle of the file', async () => {
    const client = clientWith(bodyFor([9]));
    const fetch = createS3RangeFetcher('my-bucket', 'puzzles.bin', client);

    await fetch(1000, 10);

    const command = client.send.mock.calls[0][0] as GetObjectCommand;
    expect(command.input.Range).toBe('bytes=1000-1009');
  });

  it('buffers the response body', async () => {
    const client = clientWith(bodyFor([1, 2, 3]));
    const fetch = createS3RangeFetcher('my-bucket', 'puzzles.bin', client);

    const result = await fetch(0, 3);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect([...result]).toEqual([1, 2, 3]);
  });

  it('throws when the object has no body', async () => {
    const client = clientWith(undefined);
    const fetch = createS3RangeFetcher('my-bucket', 'puzzles.bin', client);

    await expect(fetch(0, 10)).rejects.toThrow(
      'Empty response for s3://my-bucket/puzzles.bin at 0',
    );
  });

  it('reuses one default client across calls when none is supplied', () => {
    // Constructing the default client twice must not throw and must hit the
    // cached branch on the second call.
    expect(() =>
      createS3RangeFetcher('my-bucket', 'puzzles.bin'),
    ).not.toThrow();
    expect(() =>
      createS3RangeFetcher('other-bucket', 'puzzles.bin'),
    ).not.toThrow();
  });
});
