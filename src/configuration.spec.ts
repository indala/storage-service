import { describe, expect, it } from '@jest/globals';
import { getAllowedOrigins, isAllowedOrigin, validateEnvironment } from './configuration';

describe('storage-service configuration', () => {
  const baseEnvironment = {
    STORAGE_SERVICE_SECRET: 'storage-secret',
  };

  it('applies safe defaults for development', () => {
    const config = validateEnvironment(baseEnvironment);

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.FRONTEND_URL).toBe('https://ijitest.org');
    expect(config.MULTIPART_FILE_SIZE).toBe(50 * 1024 * 1024);
  });

  it('requires the internal service secret', () => {
    expect(() => validateEnvironment({})).toThrow(
      'STORAGE_SERVICE_SECRET is required',
    );
  });

  it('requires processing credentials in production', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        NODE_ENV: 'production',
      }),
    ).toThrow('ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY are required');
  });

  it('rejects invalid numeric configuration', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        PORT: 'not-a-port',
      }),
    ).toThrow('PORT must be a positive integer');
  });

  it('normalizes and evaluates allowed origins consistently', () => {
    const origins = getAllowedOrigins('https://example.test/');

    expect(origins).toContain('https://example.test');
    expect(isAllowedOrigin('https://example.test/', origins)).toBe(true);
    expect(isAllowedOrigin('https://malicious.test', origins)).toBe(false);
    expect(isAllowedOrigin(undefined, origins)).toBe(true);
  });
});
