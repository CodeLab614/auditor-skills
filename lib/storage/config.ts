export type StorageDriver = 'local' | 's3';

export interface S3StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
  forcePathStyle: boolean;
}

const requiredS3Variables = [
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_URL',
] as const;

export function getStorageDriver(env: NodeJS.ProcessEnv = process.env): StorageDriver {
  const driver = env.STORAGE_DRIVER?.trim().toLowerCase() || 'local';
  if (driver !== 'local' && driver !== 's3') {
    throw new Error(`Invalid STORAGE_DRIVER "${driver}". Use "local" or "s3".`);
  }
  return driver;
}

export function getStorageConfigError(env: NodeJS.ProcessEnv = process.env): string | null {
  try {
    getStorageDriver(env);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return getS3StorageConfigError(env);
}

export function getS3StorageConfigError(env: NodeJS.ProcessEnv = process.env): string | null {
  if ((env.STORAGE_DRIVER || 'local').trim().toLowerCase() !== 's3') return null;
  const missing = requiredS3Variables.filter((key) => !env[key]?.trim());
  if (missing.length) {
    return `STORAGE_DRIVER=s3 requires ${missing.join(', ')}. See docs/en/05-file-storage.md.`;
  }
  const pathStyle = env.S3_FORCE_PATH_STYLE?.trim().toLowerCase();
  if (pathStyle && pathStyle !== 'true' && pathStyle !== 'false') {
    return 'S3_FORCE_PATH_STYLE must be "true" or "false" when set.';
  }
  try {
    const publicUrl = new URL(env.S3_PUBLIC_URL!);
    if (!['http:', 'https:'].includes(publicUrl.protocol)) throw new Error();
  } catch {
    return 'S3_PUBLIC_URL must be a valid public HTTP or HTTPS URL.';
  }
  return null;
}

export function getS3StorageConfig(env: NodeJS.ProcessEnv = process.env): S3StorageConfig {
  const error = getS3StorageConfigError(env);
  if (error) throw new Error(error);
  return {
    endpoint: env.S3_ENDPOINT?.trim() || undefined,
    region: env.S3_REGION!.trim(),
    bucket: env.S3_BUCKET!.trim(),
    accessKeyId: env.S3_ACCESS_KEY_ID!.trim(),
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!.trim(),
    publicUrl: env.S3_PUBLIC_URL!.trim().replace(/\/+$/, ''),
    forcePathStyle: env.S3_FORCE_PATH_STYLE?.trim().toLowerCase() === 'true',
  };
}
