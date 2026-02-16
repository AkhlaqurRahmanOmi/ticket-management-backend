import { ConfigService } from '@nestjs/config';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './common/bootstrap';
import { OpenApiModule } from './common/open-api.module';
import {
  buildApiDocsDescription,
  buildApiDocsTitle,
} from './common/constants/app';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const apiVersion = configService.get<string>('app.apiVersion', '1');
  const apiDocsPath = configService.get<string>('app.apiDocsPath', 'docs');
  const appEnv = configService.get<string>('app.nodeEnv', 'development');
  const port = configService.get<number>('app.port', 3000);
  const deployedAt = new Date().toISOString();
  configureApp(app);
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });
  const swaggerConfig = new DocumentBuilder()
    .setTitle(buildApiDocsTitle(appEnv))
    .setDescription(buildApiDocsDescription(deployedAt))
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .addServer(`http://localhost:${port}`)
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  OpenApiModule.setup(apiDocsPath, app, swaggerDocument);

  await app.listen(port);
  const appUrl = await app.getUrl();
  logger.log(`Application is running on: ${appUrl}`);
  logger.log(`API base URL: ${appUrl}/${apiPrefix}/v${apiVersion}`);
  logger.log(`API docs: ${appUrl}/${apiDocsPath}`);
  logger.log(`OpenAPI JSON: ${appUrl}/${apiDocsPath}.json`);
}
bootstrap();
