import { Controller, Get, Redirect } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) { }

  /**
   * Redirects root API requests to the frontend website.
   */
  @Get()
  @Redirect()
  redirectRoot() {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'https://ijitest.org';
    return { url: frontendUrl, statusCode: 302 };
  }
}
