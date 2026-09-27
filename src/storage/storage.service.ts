import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream, ReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly storageRoot: string;

  constructor(private readonly configService: ConfigService) {
    // Default to a folder outside the project directory if not specified (e.g. d:/lab2/storage)
    const configuredDir = this.configService.get<string>('STORAGE_DIR');
    this.storageRoot = configuredDir
      ? path.resolve(configuredDir)
      : path.resolve(process.cwd(), './storage');
  }

  async checkReadiness(): Promise<void> {
    await fs.mkdir(this.storageRoot, { recursive: true });
    await fs.access(this.storageRoot);
  }

  /**
   * Resolves a relative path within the base storage root and prevents directory traversal.
   */
  private resolveSafePath(relativePath: string): string {
    if (!relativePath || relativePath.includes('\0')) {
      throw new BadRequestException('A valid storage path is required.');
    }

    const cleanPath = relativePath.replace(/^[/\\]+/, '');
    const resolvedTarget = path.resolve(this.storageRoot, cleanPath);
    const relativeTarget = path.relative(this.storageRoot, resolvedTarget);

    if (
      relativeTarget === '..' ||
      relativeTarget.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativeTarget)
    ) {
      throw new BadRequestException(
        'Unsafe path: Directory traversal detected.',
      );
    }

    return resolvedTarget;
  }

  /**
   * Writes a readable stream to disk at the specified relative location.
   */
  async uploadFile(
    relativePath: string,
    fileStream: Readable,
  ): Promise<string> {
    const targetPath = this.resolveSafePath(relativePath);
    const parentDir = path.dirname(targetPath);

    try {
      await fs.mkdir(parentDir, { recursive: true });
      const writeStream = createWriteStream(targetPath);
      await pipeline(fileStream, writeStream);
      return relativePath;
    } catch (error) {
      console.error(`Failed to write file to ${targetPath}:`, error);
      throw new BadRequestException('Failed to upload file to storage.');
    }
  }

  /**
   * Returns a file read stream for downloading/serving.
   */
  async getFileStream(relativePath: string): Promise<ReadStream> {
    const targetPath = this.resolveSafePath(relativePath);

    try {
      await fs.access(targetPath);
      return createReadStream(targetPath);
    } catch {
      throw new NotFoundException('Requested file not found in storage.');
    }
  }

  /**
   * Deletes a file from storage.
   */
  async deleteFile(relativePath: string): Promise<void> {
    const targetPath = this.resolveSafePath(relativePath);

    try {
      await fs.access(targetPath);
      await fs.unlink(targetPath);
      console.log(`Deleted file: ${targetPath}`);
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        return;
      }

      console.error(`Failed to delete file from storage: ${targetPath}`, error);
      throw new InternalServerErrorException(
        'Failed to delete file from storage.',
      );
    }
  }

  /**
   * Recursively calculates the total size of all files inside the storage root directory.
   */
  async getStorageSize(): Promise<number> {
    const calculateSize = async (dirPath: string): Promise<number> => {
      let totalSize = 0;
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          totalSize += await calculateSize(entryPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(entryPath);
          totalSize += stats.size;
        }
      }
      return totalSize;
    };

    try {
      return await calculateSize(this.storageRoot);
    } catch (error: unknown) {
      console.error('Error calculating storage size.', error);
      throw new InternalServerErrorException(
        'Unable to calculate storage size.',
      );
    }
  }

  /**
   * Recursively calculates detailed storage metrics (total size and file count).
   */
  async getStorageStats(): Promise<{ sizeBytes: number; sizeMB: number; fileCount: number }> {
    let totalSize = 0;
    let fileCount = 0;

    const scanDir = async (dirPath: string): Promise<void> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          await scanDir(entryPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(entryPath);
          totalSize += stats.size;
          fileCount += 1;
        }
      }
    };

    try {
      await scanDir(this.storageRoot);
    } catch (error: unknown) {
      console.error('Error scanning storage directory.', error);
      throw new InternalServerErrorException(
        'Unable to calculate storage statistics.',
      );
    }
    const sizeMB = Math.round((totalSize / (1024 * 1024)) * 100) / 100;
    return { sizeBytes: totalSize, sizeMB, fileCount };
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
