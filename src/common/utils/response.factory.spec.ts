import {
  createErrorResponse,
  createSuccessResponse,
} from './response.factory';

describe('response.factory', () => {
  it('creates success response with default message', () => {
    const result = createSuccessResponse(
      { ok: true },
      { path: '/test', correlationId: 'req-1' },
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe('Success');
    expect(result.data).toEqual({ ok: true });
    expect(result.correlationId).toBe('req-1');
    expect(result.path).toBe('/test');
    expect(result.timestamp).toBeTruthy();
  });

  it('creates error response with details', () => {
    const result = createErrorResponse(
      { path: '/test', correlationId: 'req-2' },
      {
        message: 'Bad request',
        code: 'VALIDATION_ERROR',
        details: ['field is required'],
      },
    );

    expect(result.success).toBe(false);
    expect(result.message).toBe('Bad request');
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error.details).toEqual(['field is required']);
    expect(result.correlationId).toBe('req-2');
    expect(result.path).toBe('/test');
    expect(result.timestamp).toBeTruthy();
  });
});
