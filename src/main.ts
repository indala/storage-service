import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import fastifyMultipart from '@fastify/multipart';
import { ConfigService } from '@nestjs/config';
import {
  getAllowedOrigins,
  isAllowedOrigin,
} from './configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const configService = app.get(ConfigService);
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') ?? 'https://ijitest.org';

  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyMultipart, {
    limits: {
      fieldNameSize:
        configService.get<number>('MULTIPART_FIELD_NAME_SIZE') ?? 100,
      fieldSize: configService.get<number>('MULTIPART_FIELD_SIZE') ?? 100,
      fields: configService.get<number>('MULTIPART_FIELDS') ?? 10,
      fileSize:
        configService.get<number>('MULTIPART_FILE_SIZE') ?? 50 * 1024 * 1024,
      files: configService.get<number>('MULTIPART_FILES') ?? 1,
    },
  });

  const allowedOrigins = getAllowedOrigins(frontendUrl);

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') ?? 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Storage service running on: http://localhost:${port}`);
}

bootstrap().catch((err: unknown) => {
  console.error('NestJS Bootstrap failed:', err);
  process.exitCode = 1;
});
