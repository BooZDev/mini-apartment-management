import type { CurrentUser } from 'src/auth/types/current-user';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends CurrentUser {}
  }
}
