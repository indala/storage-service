import {
  Controller,
  Get,
  Head,
  HttpException,
  HttpStatus,
  Redirect,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage/storage.service';

@Controller()
export class AppController {
  constructor(
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Redirects root API requests to the frontend website.
   */
  @Get()
  @Redirect()
  redirectRoot(): { url: string; statusCode: number } {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://ijitest.org';
    return { url: frontendUrl, statusCode: 302 };
  }

  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @Head('ready')
  async readiness(): Promise<{ status: 'ready' }> {
    try {
      await this.storageService.checkReadiness();
      return { status: 'ready' };
    } catch {
      throw new HttpException(
        { status: 'not_ready' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
