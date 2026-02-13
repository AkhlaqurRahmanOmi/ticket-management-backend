import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { configureApp } from '../src/common/bootstrap';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(({ body, headers }) => {
        expect(body.success).toBe(true);
        expect(body.message).toBe('Success');
        expect(body.data).toBe('Hello World!');
        expect(body.path).toBe('/');
        expect(body.correlationId).toBeTruthy();
        expect(headers['x-request-id']).toBeTruthy();
        expect(headers.etag).toBeTruthy();
      });
  });

  it('returns consistent error envelope for validation errors', () => {
    return request(app.getHttpServer())
      .get('/echo/not-a-number')
      .expect(400)
      .expect(({ body, headers }) => {
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.correlationId).toBeTruthy();
        expect(headers['x-request-id']).toBeTruthy();
      });
  });

  it('returns 304 when if-none-match matches etag', async () => {
    const first = await request(app.getHttpServer()).get('/').expect(200);
    const etag = first.headers.etag;

    await request(app.getHttpServer())
      .get('/')
      .set('if-none-match', etag)
      .expect(304);
  });
});
