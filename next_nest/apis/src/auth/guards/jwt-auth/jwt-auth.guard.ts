import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AppException } from 'src/common/exceptions/app.exception';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../../decorators/allow-password-change.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { CurrentUser } from '../../types/current-user';

// Guard toàn cục: mọi route cần đăng nhập, trừ route có @Public()
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = CurrentUser>(
    err: unknown,
    user: CurrentUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err instanceof AppException) throw err;
    if (err || !user) throw new AppException('UNAUTHENTICATED');

    // Tài khoản dùng mật khẩu được cấp chỉ gọi được AUTH-02, AUTH-03, AUTH-04
    const allowPasswordChange = this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (user.mustChangePassword && !allowPasswordChange) {
      throw new AppException('PASSWORD_CHANGE_REQUIRED');
    }
    return user as TUser;
  }
}
