export type ApiSuccessResponse<TData = unknown, TMeta = unknown> = {
  success: true;
  message: string;
  data: TData;
  meta?: TMeta;
  correlationId: string;
  timestamp: string;
  path: string;
};

export type ApiErrorResponse = {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
  correlationId: string;
  timestamp: string;
  path: string;
};

export type ApiResponse<TData = unknown, TMeta = unknown> =
  | ApiSuccessResponse<TData, TMeta>
  | ApiErrorResponse;
