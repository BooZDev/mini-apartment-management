import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Chống giả mạo yêu cầu từ trang khác: yêu cầu thay đổi dữ liệu phải có Origin của
 * ứng dụng (hoặc cùng nguồn với API). Thiếu Origin mà mang cookie phiên thì từ chối.
 */
export function originCheck(allowedOrigins: readonly string[], sessionCookies: readonly string[]) {
  const allowed = new Set(allowedOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();

    let origin = req.headers.origin;
    if (!origin && req.headers.referer) {
      try {
        origin = new URL(req.headers.referer).origin;
      } catch {
        origin = undefined;
      }
    }

    const cookies = req.cookies as Record<string, string> | undefined;
    const hasSession = sessionCookies.some((name) => Boolean(cookies?.[name]));
    const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;

    if (origin ? allowed.has(origin) || sameOrigin : !hasSession) return next();

    res.status(403).json({
      error: { code: 'FORBIDDEN', message: ERROR_CODES.FORBIDDEN.message, details: [], requestId: req.requestId },
    });
  };
}
