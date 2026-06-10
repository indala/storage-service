import {
  Injectable,
  NotFoundException,
  BadRequestException,
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

  /**
   * Resolves a relative path within the base storage root and prevents directory traversal.
   */
  private resolveSafePath(relativePath: string): string {
    const cleanPath = relativePath.replace(/^\/+/, '');
    const resolvedTarget = path.resolve(this.storageRoot, cleanPath);

    if (!resolvedTarget.startsWith(this.storageRoot)) {
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
    } catch (error) {
      // If it doesn't exist, we don't throw an error to remain idempotent
      console.warn(
        `File delete warning: ${targetPath} was already removed or inaccessible.`,
        error,
      );
    }
  }

  /**
   * Recursively calculates the total size of all files inside the storage root directory.
   */
  async getStorageSize(): Promise<number> {
    const calculateSize = async (dirPath: string): Promise<number> => {
      let totalSize = 0;
      try {
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
      } catch (error) {
        console.error(
          `Error calculating size for directory ${dirPath}:`,
          error,
        );
      }
      return totalSize;
    };

    return calculateSize(this.storageRoot);
  }
}
