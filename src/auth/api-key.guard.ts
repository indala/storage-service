import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    const configuredSecret = this.configService.get<string>(
      'STORAGE_SERVICE_SECRET',
    );
    if (!configuredSecret) {
      throw new Error(
        'STORAGE_SERVICE_SECRET is not configured in the storage service environment.',
      );
    }
    this.secret = configuredSecret;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header.');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== this.secret) {
      throw new UnauthorizedException('Invalid API secret key.');
    }

    return true;
  }
}
