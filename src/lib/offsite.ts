import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";

/**
 * Offsite backup към всяко S3-съвместимо хранилище
 * (Backblaze B2, AWS S3, Cloudflare R2, Coolify storage, MinIO, ...).
 *
 * Конфигурация само през env (Coolify / .env) — НЕ се дублира в базата:
 *   S3_ENDPOINT          https://s3.<region>.backblazeb2.com  (или AWS endpoint)
 *   S3_REGION            eu-central-003 / us-east-1 / auto
 *   S3_BUCKET            име на бъкета
 *   S3_ACCESS_KEY_ID     key ID
 *   S3_SECRET_ACCESS_KEY secret key
 *   S3_FORCE_PATH_STYLE  "false" само за AWS (default: true за B2/R2/Coolify/MinIO)
 */

export interface OffsiteConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export function getOffsiteConfig(): OffsiteConfig | null {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  };
}

export function isOffsiteConfigured(): boolean {
  return getOffsiteConfig() !== null;
}

export async function uploadBackupToS3(
  localPath: string,
  remoteKey: string
): Promise<{ url: string; size: number }> {
  const config = getOffsiteConfig();
  if (!config) {
    throw new Error("Offsite backup не е конфигуриран (липсват S3_* env vars)");
  }

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });

  const body = readFileSync(localPath);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: remoteKey,
      Body: body,
      ContentType: "application/octet-stream",
    })
  );

  return { url: `${config.endpoint}/${config.bucket}/${remoteKey}`, size: body.length };
}
