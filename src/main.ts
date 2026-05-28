import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import fastifyMultipart from '@fastify/multipart';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register multipart support for handling files
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100, // Max field name size in bytes
      fieldSize: 100,     // Max field value size in bytes
      fields: 10,         // Max number of non-file fields
      fileSize: 50 * 1024 * 1024, // 50MB file size limit
      files: 1,           // Max number of file fields per request
    },
  });

  // Enable CORS
  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'https://www.ijitest.org',
    credentials: true,
  });

  // Enforce validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env['PORT'] ?? '4000');
  await app.listen(port, '0.0.0.0');
  console.log(`Storage service running on: http://localhost:${port}`);
}

bootstrap().catch((err: unknown) => {
  console.error('NestJS Bootstrap failed:', err);
});

