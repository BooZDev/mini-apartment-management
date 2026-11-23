import './config/pg-types';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { SessionService } from './auth/services/session.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { bodyParserErrorHandler } from './common/middleware/body-parser-error.middleware';
import { originCheck } from './common/middleware/origin-check.middleware';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { securityHeaders } from './common/middleware/security-headers.middleware';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { EnvironmentVariables } from './config/env.validation';

const API_PREFIX = 'api/v1';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const session = app.get(SessionService);
  const isProduction = config.get('NODE_ENV', { infer: true }) === 'production';

  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.disable('x-powered-by');

  app.use(requestIdMiddleware);
  app.use(securityHeaders({ hsts: isProduction, apiPrefix: `/${API_PREFIX}` }));
  app.useBodyParser('json', { limit: '1mb' });
  app.use(bodyParserErrorHandler);
  app.use(cookieParser());

  const origins = config
    .get('CORS_ORIGINS', { infer: true })
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
  });
  app.use(originCheck(origins, [session.accessCookieName, session.refreshCookieName]));

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger mặc định tắt ở production
  const swagger = config.get('SWAGGER', { infer: true });
  if (swagger === undefined ? !isProduction : swagger === 'true') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('BlueMoon Api')
        .setDescription(
          'API phần mềm quản lý chung cư mini cho thuê. Thành công: `{ data, meta }`; lỗi: `{ error: { code, message, details, requestId } }`. Đăng nhập bằng AUTH-01, cookie phiên được trình duyệt tự gửi kèm.',
        )
        .setVersion('1.0')
        .addCookieAuth(session.accessCookieName)
        .build(),
    );
    SwaggerModule.setup('server-api', app, document, {
      jsonDocumentUrl: 'server-api-json',
      swaggerOptions: { withCredentials: true, docExpansion: 'list', tagsSorter: 'alpha' },
      customSiteTitle: 'BlueMoon Api',
    });
  }

  app.enableShutdownHooks();
  await app.listen(config.get('PORT', { infer: true }));
}

bootstrap().catch((err) => {
  console.error('Error during app bootstrap:', err);
  process.exit(1);
});
