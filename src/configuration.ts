import * as path from 'path';

export interface StorageServiceConfiguration {
  NODE_ENV: string;
  PORT: number;
  STORAGE_DIR: string;
  STORAGE_SERVICE_SECRET: string;
  FRONTEND_URL: string;
  MULTIPART_FILE_SIZE: number;
  MULTIPART_FILES: number;
  MULTIPART_FIELDS: number;
  MULTIPART_FIELD_SIZE: number;
  MULTIPART_FIELD_NAME_SIZE: number;
  ILOVEPDF_PUBLIC_KEY?: string;
  ILOVEPDF_SECRET_KEY?: string;
}

function requiredString(
  value: string | undefined,
  name: string,
): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} is required.`);
  }
  return normalized;
}

function positiveInteger(
  value: string | undefined,
  name: string,
  fallback: number,
): number {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function validateEnvironment(
  env: Record<string, unknown>,
): StorageServiceConfiguration {
  const nodeEnv = String(env['NODE_ENV'] ?? 'development');
  const storageServiceSecret = requiredString(
    typeof env['STORAGE_SERVICE_SECRET'] === 'string'
      ? env['STORAGE_SERVICE_SECRET']
      : undefined,
    'STORAGE_SERVICE_SECRET',
  );
  const frontendUrl = requiredString(
    typeof env['FRONTEND_URL'] === 'string'
      ? env['FRONTEND_URL']
      : 'https://ijitest.org',
    'FRONTEND_URL',
  );
  const publicKey =
    typeof env['ILOVEPDF_PUBLIC_KEY'] === 'string'
      ? env['ILOVEPDF_PUBLIC_KEY'].trim()
      : '';
  const secretKey =
    typeof env['ILOVEPDF_SECRET_KEY'] === 'string'
      ? env['ILOVEPDF_SECRET_KEY'].trim()
      : '';

  if (nodeEnv === 'production' && (!publicKey || !secretKey)) {
    throw new Error(
      'ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY are required in production.',
    );
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: positiveInteger(
      typeof env['PORT'] === 'string' ? env['PORT'] : undefined,
      'PORT',
      4000,
    ),
    STORAGE_DIR: path.resolve(
      typeof env['STORAGE_DIR'] === 'string' && env['STORAGE_DIR'].trim()
        ? env['STORAGE_DIR']
        : path.join(process.cwd(), 'storage'),
    ),
    STORAGE_SERVICE_SECRET: storageServiceSecret,
    FRONTEND_URL: frontendUrl.replace(/\/$/, ''),
    MULTIPART_FILE_SIZE: positiveInteger(
      typeof env['MULTIPART_FILE_SIZE'] === 'string'
        ? env['MULTIPART_FILE_SIZE']
        : undefined,
      'MULTIPART_FILE_SIZE',
      50 * 1024 * 1024,
    ),
    MULTIPART_FILES: positiveInteger(
      typeof env['MULTIPART_FILES'] === 'string'
        ? env['MULTIPART_FILES']
        : undefined,
      'MULTIPART_FILES',
      1,
    ),
    MULTIPART_FIELDS: positiveInteger(
      typeof env['MULTIPART_FIELDS'] === 'string'
        ? env['MULTIPART_FIELDS']
        : undefined,
      'MULTIPART_FIELDS',
      10,
    ),
    MULTIPART_FIELD_SIZE: positiveInteger(
      typeof env['MULTIPART_FIELD_SIZE'] === 'string'
        ? env['MULTIPART_FIELD_SIZE']
        : undefined,
      'MULTIPART_FIELD_SIZE',
      100,
    ),
    MULTIPART_FIELD_NAME_SIZE: positiveInteger(
      typeof env['MULTIPART_FIELD_NAME_SIZE'] === 'string'
        ? env['MULTIPART_FIELD_NAME_SIZE']
        : undefined,
      'MULTIPART_FIELD_NAME_SIZE',
      100,
    ),
    ...(publicKey ? { ILOVEPDF_PUBLIC_KEY: publicKey } : {}),
    ...(secretKey ? { ILOVEPDF_SECRET_KEY: secretKey } : {}),
  } as StorageServiceConfiguration;
}

export function getAllowedOrigins(frontendUrl: string): string[] {
  return [
    'https://ijitest.org',
    'https://bingopartyduo.vercel.app',
    'http://localhost:3000',
    frontendUrl.replace(/\/$/, ''),
  ].filter((origin, index, origins) => origins.indexOf(origin) === index);
}

export function isAllowedOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (!origin) {
    return true;
  }
  const normalizedOrigin = origin.replace(/\/$/, '');
  return allowedOrigins.some(
    allowedOrigin => allowedOrigin === normalizedOrigin,
  );
}
