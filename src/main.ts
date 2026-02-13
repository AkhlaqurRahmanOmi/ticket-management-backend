import { ConfigService } from '@nestjs/config';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './common/bootstrap';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const apiVersion = configService.get<string>('app.apiVersion', '1');
  const apiDocsPath = configService.get<string>('app.apiDocsPath', 'docs');
  const port = configService.get<number>('app.port', 3000);
  configureApp(app);
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ticket Booking API')
    .setDescription('API documentation')
    .setVersion(apiVersion)
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(apiDocsPath, app, swaggerDocument);

  await app.listen(port);
  const appUrl = await app.getUrl();
  logger.log(`Application is running on: ${appUrl}`);
  logger.log(`API base URL: ${appUrl}/${apiPrefix}/v${apiVersion}`);
  logger.log(`API docs: ${appUrl}/${apiDocsPath}`);
}
bootstrap();
