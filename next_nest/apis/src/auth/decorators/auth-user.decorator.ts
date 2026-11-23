import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from 'src/common/exceptions/app.exception';
import { CurrentUser } from '../types/current-user';

// Người dùng của phiên hiện tại
export const AuthUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUser => {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user) throw new AppException('UNAUTHENTICATED');
    return req.user;
  },
);
