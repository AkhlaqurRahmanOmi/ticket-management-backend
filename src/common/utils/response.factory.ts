import { ApiErrorResponse, ApiSuccessResponse } from '../types/api-response.type';

type ResponseContext = {
  path: string;
  correlationId: string;
};

export const createSuccessResponse = <TData, TMeta = unknown>(
  data: TData,
  context: ResponseContext,
  options?: { message?: string; meta?: TMeta },
): ApiSuccessResponse<TData, TMeta> => ({
  success: true,
  message: options?.message ?? 'Success',
  data,
  ...(options?.meta !== undefined ? { meta: options.meta } : {}),
  correlationId: context.correlationId,
  timestamp: new Date().toISOString(),
  path: context.path,
});

export const createErrorResponse = (
  context: ResponseContext,
  options: { message: string; code: string; details?: unknown },
): ApiErrorResponse => ({
  success: false,
  message: options.message,
  error: {
    code: options.code,
    ...(options.details !== undefined ? { details: options.details } : {}),
  },
  correlationId: context.correlationId,
  timestamp: new Date().toISOString(),
  path: context.path,
});
