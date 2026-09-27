import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StoragePathQueryDto } from './storage-path-query.dto';

describe('StoragePathQueryDto', () => {
  it.each([
    '',
    '../secret.txt',
    'submissions/../../secret.txt',
    '\\absolute\\file.pdf',
    '/absolute/file.pdf',
    'C:\\absolute\\file.pdf',
    'submissions/file\0.pdf',
  ])('rejects unsafe path %j', async (path) => {
    const dto = plainToInstance(StoragePathQueryDto, { path });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('accepts a relative path', async () => {
    const dto = plainToInstance(StoragePathQueryDto, {
      path: 'submissions/manuscript.pdf',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects unknown query properties through the application validation pipe', async () => {
    const dto = plainToInstance(StoragePathQueryDto, {
      path: 'submissions/manuscript.pdf',
      unexpected: true,
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'unexpected',
        }),
      ]),
    );
  });
});
