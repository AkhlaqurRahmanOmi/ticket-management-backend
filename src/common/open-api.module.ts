import { INestApplication, Module } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { API_DOCS_FALLBACK_TITLE } from './constants/app';

@Module({})
export class OpenApiModule {
  public static setup(
    path: string,
    app: INestApplication,
    document: OpenAPIObject,
  ): void {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const httpAdapter = app.getHttpAdapter();

    if (httpAdapter && httpAdapter.getType() === 'fastify') {
      this.setupFastify(normalizedPath, app, document);
      return;
    }

    this.setupExpress(normalizedPath, app, document);
  }

  private static setupExpress(
    path: string,
    app: INestApplication,
    document: OpenAPIObject,
  ): void {
    const httpAdapter = app.getHttpAdapter();
    const stoplightHtml = this.generateHtml(path, document.info?.title);

    httpAdapter.get(path, (_req, res) => res.send(stoplightHtml));
    httpAdapter.get(`${path}.json`, (_req, res) => res.json(document));
  }

  private static setupFastify(
    path: string,
    app: INestApplication,
    document: OpenAPIObject,
  ): void {
    const httpAdapter = app.getHttpAdapter();
    const stoplightHtml = this.generateHtml(path, document.info?.title);

    httpAdapter.get(path, (_req, res) => {
      res.type('text/html').send(stoplightHtml);
    });
    httpAdapter.get(`${path}.json`, (_req, res) => {
      res.type('application/json').send(document);
    });
  }

  private static generateHtml(path: string, title?: string): string {
    const htmlTitle = title ?? API_DOCS_FALLBACK_TITLE;
    return `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
          <title>${htmlTitle}</title>
          <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
          <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
        </head>
        <body>
          <elements-api apiDescriptionUrl="${path}.json" router="hash" />
        </body>
      </html>
    `;
  }
}
