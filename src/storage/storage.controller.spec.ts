import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { Readable } from 'stream';
import { StorageController } from './storage.controller';

describe('StorageController', () => {
  it('rejects an upload without a multipart file before calling storage', async () => {
    const storageService = {
      uploadFile: jest.fn(),
    };
    const controller = new StorageController(storageService as never);
    const request = {
      file: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      controller.upload({ path: 'submissions/file.pdf' }, request as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('passes the validated path and multipart stream to storage', async () => {
    const fileStream = Readable.from(['file contents']);
    const storageService = {
      uploadFile: jest.fn().mockResolvedValue('submissions/file.pdf'),
    };
    const controller = new StorageController(storageService as never);
    const request = {
      file: jest.fn().mockResolvedValue({ file: fileStream }),
    };

    await expect(
      controller.upload({ path: 'submissions/file.pdf' }, request as never),
    ).resolves.toEqual({
      success: true,
      filePath: 'submissions/file.pdf',
    });

    expect(storageService.uploadFile).toHaveBeenCalledWith(
      'submissions/file.pdf',
      fileStream,
    );
  });
});
