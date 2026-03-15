import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type S3Config = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

export function createS3Client(config: S3Config) {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: "auto",
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });

  return {
    async get(key: string): Promise<Buffer | null> {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
        const bytes = await res.Body?.transformToByteArray();
        return bytes ? Buffer.from(bytes) : null;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "name" in err &&
          (err as { name: string }).name === "NoSuchKey"
        ) {
          return null;
        }
        throw err;
      }
    },

    async put(key: string, data: Buffer, contentType = "application/octet-stream"): Promise<void> {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
        }),
      );
    },
  };
}
