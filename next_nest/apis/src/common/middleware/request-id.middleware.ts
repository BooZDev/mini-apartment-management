import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

// Mã yêu cầu để tra log khi có lỗi; luôn tự sinh, không nhận từ phía gọi
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
