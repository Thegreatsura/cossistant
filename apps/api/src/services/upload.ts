import path from "node:path";

import { env } from "@api/env";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ulid } from "ulid";

const LEADING_DOT_PATTERN = /^\./;

const endpoint =
  env.S3_ENDPOINT.trim().length > 0 ? env.S3_ENDPOINT : undefined;
const forcePathStyle = env.S3_FORCE_PATH_STYLE;

export const s3Client = new S3Client({
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  endpoint,
  forcePathStyle,
});

function sanitizeSegmentsFromInput(input: string | undefined): string[] {
  if (!input) {
    return [];
  }

  return input
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(
      (segment) => segment.length > 0 && segment !== "." && segment !== ".."
    )
    .map((segment) => segment.replace(/[^a-zA-Z0-9_.-]/g, "-"))
    .filter((segment) => segment.length > 0);
}

function sanitizeFileName(fileName: string | undefined): string {
  if (!fileName) {
    return ulid();
  }

  const cleaned = fileName.replace(/[\\/]/g, "").trim();
  const sanitized = cleaned.replace(/[^a-zA-Z0-9_.-]/g, "-");

  return sanitized.length > 0 ? sanitized : ulid();
}

function sanitizeExtension(extension: string | undefined): string | null {
  if (!extension) {
    return null;
  }

  const trimmed = extension.trim().replace(LEADING_DOT_PATTERN, "");
  const sanitized = trimmed.replace(/[^a-zA-Z0-9]/g, "");

  if (sanitized.length === 0) {
    return null;
  }

  return `.${sanitized.toLowerCase()}`;
}

export type GenerateUploadUrlOptions = {
  contentType: string;
  path?: string;
  fileName?: string;
  fileExtension?: string;
  expiresInSeconds?: number;
  basePathSegments?: string[];
};

export type GenerateUploadUrlResult = {
  uploadUrl: string;
  key: string;
  bucket: string;
  expiresAt: string;
  contentType: string;
};

export async function generateUploadUrl(
  options: GenerateUploadUrlOptions
): Promise<GenerateUploadUrlResult> {
  const baseSegments = (options.basePathSegments ?? [])
    .flatMap((segment) => sanitizeSegmentsFromInput(segment))
    .filter((segment) => segment.length > 0);
  const normalizedPathSegments = sanitizeSegmentsFromInput(options.path);

  const allSegments = [...baseSegments, ...normalizedPathSegments];

  const sanitizedFileName = sanitizeFileName(options.fileName);
  const extension = sanitizeExtension(options.fileExtension);

  const finalFileName = extension
    ? sanitizedFileName.endsWith(extension)
      ? sanitizedFileName
      : `${sanitizedFileName}${extension}`
    : sanitizedFileName;

  const objectKey = path.posix.join(...allSegments, finalFileName);

  const expiresIn =
    options.expiresInSeconds ?? env.S3_SIGNED_URL_EXPIRATION_SECONDS;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: objectKey,
    ContentType: options.contentType,
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      uploadUrl,
      key: objectKey,
      bucket: env.S3_BUCKET_NAME,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      contentType: options.contentType,
    };
  } catch (error) {
    throw new Error(
      `Failed to generate signed upload URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error }
    );
  }
}
