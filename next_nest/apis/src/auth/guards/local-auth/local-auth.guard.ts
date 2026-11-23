import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Request } from 'express';
import { AppException } from 'src/common/exceptions/app.exception';
import { validationDetails } from 'src/common/pipes/validation.pipe';
import { LoginDto } from '../../dto/login.dto';

// Guard chạy trước ValidationPipe: tự kiểm tra phần thân để thiếu trường trả 400 thay vì 401
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const dto = plainToInstance(LoginDto, (req.body as object | undefined) ?? {});
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length > 0) throw new AppException('VALIDATION_ERROR', validationDetails(errors));

    req.body = { username: dto.username, password: dto.password };
    return (await super.canActivate(context)) as boolean;
  }
}
