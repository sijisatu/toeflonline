import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { AppConfigService } from './shared/config/app-config.service';

async function bootstrap() {
  const certPath = resolve(process.cwd(), '..', 'certs', 'toefl-local-dev.pem');
  const keyPath = resolve(process.cwd(), '..', 'certs', 'toefl-local-dev-key.pem');
  const httpsConfig =
    existsSync(certPath) && existsSync(keyPath)
      ? {
          cert: readFileSync(certPath),
          key: readFileSync(keyPath),
        }
      : undefined;

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 25 * 1024 * 1024,
      ...(httpsConfig ? { https: httpsConfig } : {}),
    }),
  );

  const config = app.get(AppConfigService);
  const lanOriginPattern =
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.origins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (config.env === 'development' && lanOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`), false);
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(config.port, '0.0.0.0');
}

void bootstrap();
