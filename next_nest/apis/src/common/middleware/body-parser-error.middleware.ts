import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES, ErrorCode } from '../constants/error-codes';

// Lỗi đọc phần thân (JSON sai, quá 1 MB) xảy ra trước Nest: trả cùng khuôn lỗi của API
export function bodyParserErrorHandler(
  err: { type?: string; status?: number },
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let code: ErrorCode | null = null;
  if (err?.type === 'entity.too.large') code = 'PAYLOAD_TOO_LARGE';
  else if (err?.type === 'entity.parse.failed' || err?.status === 400) code = 'VALIDATION_ERROR';
  if (!code) return next(err);

  res.status(ERROR_CODES[code].status).json({
    error: {
      code,
      message: code === 'VALIDATION_ERROR' ? 'Dữ liệu gửi lên không đúng định dạng JSON' : ERROR_CODES[code].message,
      details: [],
      requestId: req.requestId,
    },
  });
}
