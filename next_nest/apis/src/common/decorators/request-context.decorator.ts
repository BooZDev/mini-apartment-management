import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from 'src/auth/types/current-user';
import { AppException } from '../exceptions/app.exception';

// Người thao tác và mã yêu cầu, dùng để ghi nhật ký trong cùng giao dịch
export type RequestContext = {
  user: CurrentUser;
  requestId: string;
};

export const ReqCtx = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestContext => {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user) throw new AppException('UNAUTHENTICATED');
    return { user: req.user, requestId: req.requestId };
  },
);
