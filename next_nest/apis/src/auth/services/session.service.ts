import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import type { CookieOptions, Request, Response } from 'express';
import { DataSource, EntityManager } from 'typeorm';
import { selectOne } from 'src/common/database/query.util';
import sessionConfig from '../config/session.config';
import { AuthJwtPayload } from '../types/auth-jwt-payload';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET_RE = /^[A-Za-z0-9_-]{43}$/;

type SessionRow = {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  previous_token_hash: string | null;
  in_grace: boolean;
  usable: boolean;
  expires_at: Date;
};

export type RotateResult =
  | { ok: true; userId: string; sessionId: string; secret: string; expiresAt: Date }
  | { ok: false; sessionId?: string; reused: boolean };

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function sameHash(a: string, b: string | null) {
  return b !== null && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Phiên đăng nhập: access token (JWT, 15 phút) và refresh token (ngẫu nhiên, lưu mã băm
 * ở user_sessions), cả hai trong cookie HttpOnly. Refresh token xoay vòng mỗi lần dùng;
 * token cũ bị dùng lại thì hủy cả phiên.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(sessionConfig.KEY)
    private readonly config: ConfigType<typeof sessionConfig>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  get accessCookieName() {
    return this.config.accessCookie;
  }

  get refreshCookieName() {
    return this.config.refreshCookie;
  }

  // Đăng nhập: tạo phiên mới
  async create(res: Response, userId: string, sessionVersion: number) {
    const secret = randomBytes(32).toString('base64url');
    const row = await selectOne<{ id: string; expires_at: Date }>(
      this.dataSource.manager,
      `insert into public.user_sessions (user_id, refresh_token_hash, expires_at)
       values ($1, $2, now() + make_interval(secs => $3))
       returning id, expires_at`,
      [userId, sha256(secret), this.config.maxSeconds],
    );
    if (!row) throw new Error('Không tạo được phiên đăng nhập');
    this.setAccessCookie(res, { sub: userId, sid: row.id, sv: sessionVersion }, row.expires_at);
    this.setRefreshCookie(res, row.id, secret, row.expires_at);
  }

  /** Xoay vòng refresh token trong giao dịch của người gọi. */
  async rotate(manager: EntityManager, req: Request): Promise<RotateResult> {
    const token = this.readRefreshToken(req);
    if (!token) return { ok: false, reused: false };

    const session = await selectOne<SessionRow>(
      manager,
      `select id, user_id, refresh_token_hash, previous_token_hash, expires_at,
              coalesce(rotated_at > now() - make_interval(secs => $2), false) as in_grace,
              (revoked_at is null and expires_at > now()
               and last_seen_at > now() - make_interval(secs => $3)) as usable
         from public.user_sessions where id = $1 for update`,
      [token.sessionId, this.config.reuseGraceSeconds, this.config.idleSeconds],
    );
    if (!session || !session.usable) return { ok: false, sessionId: session?.id, reused: false };

    const hash = sha256(token.secret);
    const valid =
      sameHash(hash, session.refresh_token_hash) ||
      (session.in_grace && sameHash(hash, session.previous_token_hash));
    if (!valid) {
      this.logger.warn(`Refresh token cũ bị dùng lại, hủy phiên ${session.id}`);
      return { ok: false, sessionId: session.id, reused: true };
    }

    const secret = randomBytes(32).toString('base64url');
    await manager.query(
      `update public.user_sessions
          set previous_token_hash = refresh_token_hash, refresh_token_hash = $2,
              rotated_at = now(), last_seen_at = now()
        where id = $1`,
      [session.id, sha256(secret)],
    );
    return { ok: true, userId: session.user_id, sessionId: session.id, secret, expiresAt: session.expires_at };
  }

  /** Phiên còn dùng được; đánh dấu hoạt động (tối đa một lần mỗi phút) để tính 30 phút không hoạt động. */
  async touch(sessionId: string, userId: string) {
    const row = await selectOne<{ expires_at: Date; stale: boolean }>(
      this.dataSource.manager,
      `select expires_at, last_seen_at < now() - interval '60 seconds' as stale
         from public.user_sessions
        where id = $1 and user_id = $2 and revoked_at is null and expires_at > now()
          and last_seen_at > now() - make_interval(secs => $3)`,
      [sessionId, userId, this.config.idleSeconds],
    );
    if (row?.stale) {
      await this.dataSource.query(`update public.user_sessions set last_seen_at = now() where id = $1`, [sessionId]);
    }
    return row !== null;
  }

  async revoke(sessionId: string) {
    await this.dataSource.query(
      `update public.user_sessions set revoked_at = now() where id = $1 and revoked_at is null`,
      [sessionId],
    );
  }

  /** id phiên từ access token (bỏ qua hạn) hoặc refresh token, dùng khi đăng xuất. */
  sessionIdOf(req: Request): string | null {
    const access = this.cookie(req, this.config.accessCookie);
    if (access) {
      try {
        return this.jwtService.verify<AuthJwtPayload>(access, { ignoreExpiration: true }).sid;
      } catch {
        // chữ ký sai: bỏ qua, thử refresh token
      }
    }
    return this.readRefreshToken(req)?.sessionId ?? null;
  }

  setAccessCookie(res: Response, payload: AuthJwtPayload, sessionExpiresAt: Date) {
    const seconds = Math.max(
      1,
      Math.min(this.config.accessSeconds, Math.floor((sessionExpiresAt.getTime() - Date.now()) / 1000)),
    );
    const token = this.jwtService.sign({ sub: payload.sub, sid: payload.sid, sv: payload.sv }, { expiresIn: seconds });
    res.cookie(this.config.accessCookie, token, { ...this.baseCookie(), path: '/', maxAge: seconds * 1000 });
  }

  setRefreshCookie(res: Response, sessionId: string, secret: string, expiresAt: Date) {
    res.cookie(this.config.refreshCookie, `${sessionId}.${secret}`, {
      ...this.baseCookie(),
      path: this.config.refreshPath,
      maxAge: Math.max(1, expiresAt.getTime() - Date.now()),
    });
  }

  clearCookies(res: Response) {
    res.clearCookie(this.config.accessCookie, { ...this.baseCookie(), path: '/' });
    res.clearCookie(this.config.refreshCookie, { ...this.baseCookie(), path: this.config.refreshPath });
  }

  private readRefreshToken(req: Request) {
    const value = this.cookie(req, this.config.refreshCookie);
    const [sessionId, secret] = value?.split('.') ?? [];
    if (!sessionId || !secret || !UUID_RE.test(sessionId) || !SECRET_RE.test(secret)) return null;
    return { sessionId, secret };
  }

  private cookie(req: Request, name: string): string | undefined {
    return (req.cookies as Record<string, string> | undefined)?.[name];
  }

  private baseCookie(): CookieOptions {
    // SameSite=Lax: cookie không đi kèm yêu cầu POST từ trang khác
    return { httpOnly: true, secure: this.config.secure, sameSite: 'lax' };
  }
}
