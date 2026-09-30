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

/**
 * Качва файловете от data/uploads (снимки) и data/incoming-invoices (PDF-и на входящи
 * фактури) — backup-ът на базата не ги съдържа. Качват се само нови/променени файлове;
 * списъкът с вече качените се пази в data/backups/offsite-files.json.
 */
export async function syncFilesToS3(dataDir: string): Promise<{ uploaded: number; skipped: number }> {
  const config = getOffsiteConfig();
  if (!config) throw new Error("Offsite backup не е конфигуриран");
  const { readdirSync, statSync, existsSync, writeFileSync, mkdirSync } = await import("fs");
  const path = await import("path");

  const manifestPath = path.join(dataDir, "backups", "offsite-files.json");
  const manifest: Record<string, string> = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: config.forcePathStyle,
  });

  let uploaded = 0;
  let skipped = 0;
  for (const sub of ["uploads", "incoming-invoices"]) {
    const dir = path.join(dataDir, sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      const st = statSync(file);
      if (!st.isFile()) continue;
      const key = `beton-erp/files/${sub}/${name}`;
      const sig = `${st.size}:${st.mtimeMs}`;
      if (manifest[key] === sig) { skipped++; continue; }
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: readFileSync(file) }));
      manifest[key] = sig;
      uploaded++;
    }
  }
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest));
  return { uploaded, skipped };
}
