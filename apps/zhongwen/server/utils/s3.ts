import * as Minio from "minio";

type S3Config = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

export function createS3Client(config: S3Config) {
  const client = new Minio.Client({
    endPoint: config.endpoint,
    port: 443,
    useSSL: true,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });

  return {
    async get(key: string): Promise<Buffer | null> {
      try {
        const stream = await client.getObject(config.bucket, key);
        return await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on("data", (chunk: Buffer) => chunks.push(chunk));
          stream.on("end", () => resolve(Buffer.concat(chunks)));
          stream.on("error", reject);
        });
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "NoSuchKey"
        ) {
          return null;
        }
        throw err;
      }
    },

    async put(key: string, data: Buffer, contentType = "application/octet-stream"): Promise<void> {
      await client.putObject(config.bucket, key, data, data.length, {
        "Content-Type": contentType,
      });
    },
  };
}
