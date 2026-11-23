import type { NextFunction, Request, Response } from 'express';

export function securityHeaders(options: { hsts: boolean; apiPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (options.hsts) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    // Phản hồi API có dữ liệu cá nhân, tiền: không lưu đệm. Trang Swagger không áp CSP này
    if (req.path.startsWith(options.apiPrefix)) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    }
    next();
  };
}
