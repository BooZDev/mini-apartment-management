import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import jwtConfig from '../config/jwt.config';
import sessionConfig from '../config/session.config';
import { AuthService } from '../auth.service';
import { AuthJwtPayload } from '../types/auth-jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    jwtConfiguration: ConfigType<typeof jwtConfig>,
    @Inject(sessionConfig.KEY)
    sessionConfiguration: ConfigType<typeof sessionConfig>,
    private readonly authService: AuthService,
  ) {
    super({
      // Chỉ nhận token trong cookie HttpOnly
      jwtFromRequest: (req: Request) =>
        (req.cookies as Record<string, string> | undefined)?.[sessionConfiguration.accessCookie] ?? null,
      secretOrKey: jwtConfiguration.secret as string,
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  validate(payload: AuthJwtPayload) {
    return this.authService.validateSession(payload);
  }
}
