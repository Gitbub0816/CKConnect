import "server-only";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | undefined;

function getR2() {
  if (!process.env.CLOUDFLARE_R2_ENDPOINT || !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
    throw new Error("Cloudflare R2 is not configured");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

function bucket() {
  const value = process.env.CLOUDFLARE_R2_BUCKET;
  if (!value) throw new Error("CLOUDFLARE_R2_BUCKET is not configured");
  return value;
}

export function signR2Upload(input: { key: string; contentType: string }) {
  return getSignedUrl(getR2(), new PutObjectCommand({
    Bucket: bucket(),
    Key: input.key,
    ContentType: input.contentType,
  }), { expiresIn: 900 });
}

export function signR2Download(key: string, fileName: string) {
  return getSignedUrl(getR2(), new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${fileName.replaceAll('"', "")}"`,
  }), { expiresIn: 300 });
}
