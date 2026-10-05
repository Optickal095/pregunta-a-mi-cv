import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:4200',
  'https://optickal095.github.io',
];

/** Global app configuration, shared by `main.ts` and the e2e tests. */
export function setupApp(app: NestExpressApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const origins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim());
  app.enableCors({ origin: origins?.length ? origins : DEFAULT_CORS_ORIGINS });

  // Behind the hosting proxy (Hugging Face Spaces) every request comes from
  // the proxy's address. Trusting one hop makes `req.ip` the visitor's IP,
  // which the rate limit relies on.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
}
