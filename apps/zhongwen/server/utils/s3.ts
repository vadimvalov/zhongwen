import { AwsClient } from "aws4fetch";

type S3Config = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

export function createS3Client(config: S3Config) {
  const aws = new AwsClient({
    accessKeyId: config.accessKey,
    secretAccessKey: config.secretKey,
    service: "s3",
  });

  function objectUrl(key: string) {
    return `${config.endpoint}/${config.bucket}/${key}`;
  }

  return {
    async get(key: string): Promise<Buffer | null> {
      const res = await aws.fetch(objectUrl(key));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`S3 GET failed: ${res.status} ${res.statusText}`);
      return Buffer.from(await res.arrayBuffer());
    },

    async put(key: string, data: Buffer, contentType = "application/octet-stream"): Promise<void> {
      const res = await aws.fetch(objectUrl(key), {
        method: "PUT",
        body: data.buffer as ArrayBuffer,
        headers: { "Content-Type": contentType },
      });
      if (!res.ok) throw new Error(`S3 PUT failed: ${res.status} ${res.statusText}`);
    },
  };
}
