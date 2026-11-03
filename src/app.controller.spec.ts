import { describe, expect, it, jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import { AppController } from './app.controller';

describe('AppController health endpoints', () => {
  it('reports liveness without exposing configuration', () => {
    const controller = new AppController(
      { get: jest.fn() } as never,
      { checkReadiness: jest.fn() } as never,
    );

    expect(controller.health()).toEqual({ status: 'ok' });
  });

  it('reports readiness when storage is accessible', async () => {
    const checkReadiness = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const controller = new AppController(
      { get: jest.fn() } as never,
      { checkReadiness } as never,
    );

    await expect(controller.readiness()).resolves.toEqual({ status: 'ready' });
    expect(checkReadiness).toHaveBeenCalledTimes(1);
  });

  it('returns service unavailable when storage is inaccessible', async () => {
    const controller = new AppController(
      { get: jest.fn() } as never,
      {
        checkReadiness: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('denied')),
      } as never,
    );

    await expect(controller.readiness()).rejects.toMatchObject(
      new HttpException({ status: 'not_ready' }, 503),
    );
  });
});
