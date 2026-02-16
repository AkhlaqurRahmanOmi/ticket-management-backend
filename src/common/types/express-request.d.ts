import type { AuthUser } from '@/common/auth/auth-user.type';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: AuthUser;
    }
  }
}

export {};
