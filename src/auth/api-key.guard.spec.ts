import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function createContext(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authorization ? { authorization } : {},
      }),
    }),
  } as never;
}

function createConfigService(secret?: string) {
  return {
    get: () => secret,
  } as never;
}

describe('ApiKeyGuard', () => {
  it('accepts the configured Bearer secret', () => {
    const guard = new ApiKeyGuard(createConfigService('storage-secret'));

    expect(guard.canActivate(createContext('Bearer storage-secret'))).toBe(
      true,
    );
  });

  it.each([undefined, 'Bearer wrong-secret', 'storage-secret'])(
    'rejects an invalid authorization header: %j',
    (authorization) => {
      const guard = new ApiKeyGuard(createConfigService('storage-secret'));

      expect(() => guard.canActivate(createContext(authorization))).toThrow(
        UnauthorizedException,
      );
    },
  );

  it('fails fast when the storage secret is not configured', () => {
    expect(() => new ApiKeyGuard(createConfigService())).toThrow(
      'STORAGE_SERVICE_SECRET is not configured',
    );
  });
});
