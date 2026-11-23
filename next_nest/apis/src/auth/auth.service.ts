import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { selectOne, updateReturning } from 'src/common/database/query.util';
import { AppException } from 'src/common/exceptions/app.exception';
import { vnToday } from 'src/common/utils/date.util';
import { comparePassword, hashPassword, isStrongPassword } from 'src/common/utils/password.util';
import { UserStatus } from 'src/users/enums/user-status.enum';
import { UsersService } from 'src/users/users.service';
import { resolveAccountStatus } from 'src/users/utils/account-status.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginAttemptsService } from './services/login-attempts.service';
import { revokeUserSessions } from './services/session-store';
import { SessionService } from './services/session.service';
import { AuthJwtPayload } from './types/auth-jwt-payload';
import { CurrentUser } from './types/current-user';

@Injectable()
export class AuthService {
  // Tên đăng nhập không tồn tại vẫn so bcrypt một lần: thời gian phản hồi như sai mật khẩu
  private readonly dummyHash = hashPassword(randomUUID());

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly loginAttemptsService: LoginAttemptsService,
    private readonly sessionService: SessionService,
  ) {}

  // AUTH-01 bước 1 đến 3
  async validateUser(username: string, password: string, ip: string) {
    await this.loginAttemptsService.assertNotLocked(username, ip);

    const credentials = await this.usersService.findCredentials(username);
    const isPasswordMatch = await comparePassword(password, credentials?.password_hash ?? (await this.dummyHash));

    if (!credentials || !isPasswordMatch) {
      await this.loginAttemptsService.recordFailure(username, ip);
      throw new AppException('INVALID_CREDENTIALS');
    }

    await this.loginAttemptsService.clear(username, ip);

    // Chỉ báo bị khóa sau khi mật khẩu đúng, không lộ tên đăng nhập
    const account = await this.usersService.findAccount(credentials.id);
    if (!account) throw new AppException('INVALID_CREDENTIALS');
    if (resolveAccountStatus(account.status, account.ended_on, vnToday()).status === UserStatus.LOCKED) {
      throw new AppException('ACCOUNT_LOCKED');
    }
    return { id: account.id };
  }

  // AUTH-01 bước 4
  async login(userId: string, res: Response) {
    const [row] = await updateReturning<{ session_version: number }>(
      this.dataSource.manager,
      `update public.users set last_login_at = now() where id = $1 returning session_version`,
      [userId],
    );
    await this.sessionService.create(res, userId, row.session_version);
    return this.usersService.findOne(userId);
  }

  // AUTH-05 Làm mới phiên
  async refresh(req: Request, res: Response) {
    const result = await this.dataSource.transaction((manager) => this.sessionService.rotate(manager, req));

    if (!result.ok) {
      if (result.reused && result.sessionId) await this.sessionService.revoke(result.sessionId);
      this.sessionService.clearCookies(res);
      throw new AppException('UNAUTHENTICATED');
    }

    const account = await this.usersService.findAccount(result.userId);
    const user = account ? this.usersService.toResponse(account) : null;
    if (!account || !user || user.status === UserStatus.LOCKED) {
      await this.sessionService.revoke(result.sessionId);
      this.sessionService.clearCookies(res);
      throw new AppException('UNAUTHENTICATED');
    }

    this.sessionService.setAccessCookie(
      res,
      { sub: account.id, sid: result.sessionId, sv: account.session_version },
      result.expiresAt,
    );
    this.sessionService.setRefreshCookie(res, result.sessionId, result.secret, result.expiresAt);
    return user;
  }

  /** Mỗi yêu cầu: phiên còn hiệu lực, tài khoản còn dùng được; vai trò đọc lại từ CSDL. */
  async validateSession(payload: AuthJwtPayload): Promise<CurrentUser> {
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string' || typeof payload.sv !== 'number') {
      throw new AppException('UNAUTHENTICATED');
    }

    const [account, sessionOk] = await Promise.all([
      this.usersService.findAccount(payload.sub),
      this.sessionService.touch(payload.sid, payload.sub),
    ]);
    if (!account || !sessionOk || account.session_version !== payload.sv) {
      throw new AppException('UNAUTHENTICATED');
    }

    const user = this.usersService.toResponse(account);
    // Người thuê hết 30 ngày chỉ đọc cũng là LOCKED: phiên đang mở hết hiệu lực
    if (user.status === UserStatus.LOCKED) throw new AppException('UNAUTHENTICATED');

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      roles: user.roles,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      tenant: user.tenant,
      sessionId: payload.sid,
    };
  }

  // AUTH-02 Đăng xuất: phiên đã hết hạn vẫn thành công
  async logout(req: Request, res: Response) {
    const sessionId = this.sessionService.sessionIdOf(req);
    if (sessionId) await this.sessionService.revoke(sessionId);
    this.sessionService.clearCookies(res);
  }

  // AUTH-04 Đổi mật khẩu: hủy các phiên khác, giữ phiên hiện tại
  async changePassword(user: CurrentUser, dto: ChangePasswordDto, res: Response) {
    const current = await selectOne<{ password_hash: string }>(
      this.dataSource.manager,
      `select password_hash from public.users where id = $1`,
      [user.id],
    );
    if (!current || !(await comparePassword(dto.currentPassword, current.password_hash))) {
      throw new AppException('WRONG_CURRENT_PASSWORD');
    }
    if (!isStrongPassword(dto.newPassword) || dto.newPassword === dto.currentPassword) {
      throw new AppException('WEAK_PASSWORD');
    }

    const passwordHash = await hashPassword(dto.newPassword);
    const { sessionVersion, expiresAt } = await this.dataSource.transaction(async (manager) => {
      const [row] = await updateReturning<{ session_version: number }>(
        manager,
        `update public.users
            set password_hash = $2, must_change_password = false, session_version = session_version + 1
          where id = $1
          returning session_version`,
        [user.id, passwordHash],
      );
      await revokeUserSessions(manager, user.id, user.sessionId);
      const session = await selectOne<{ expires_at: Date }>(
        manager,
        `select expires_at from public.user_sessions where id = $1`,
        [user.sessionId],
      );
      return { sessionVersion: row.session_version, expiresAt: session?.expires_at ?? new Date() };
    });

    this.sessionService.setAccessCookie(res, { sub: user.id, sid: user.sessionId, sv: sessionVersion }, expiresAt);
  }
}
