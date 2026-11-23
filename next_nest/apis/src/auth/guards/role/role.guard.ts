import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from 'src/common/exceptions/app.exception';
import { ROLE_KEY } from '../../decorators/role.decorator';
import { Role } from '../../enums/role.enum';

// Lớp kiểm tra quyền theo vai trò; lớp theo dữ liệu (phòng của người thuê) nằm ở service
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<Request>();

    if (!user) throw new AppException('UNAUTHENTICATED');

    if (!requiredRoles.some((role) => user.roles.includes(role))) throw new AppException('FORBIDDEN');
    return true;
  }
}
