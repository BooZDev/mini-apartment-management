import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-local';
import { clientIp } from 'src/common/utils/ip.util';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'username', passwordField: 'password', passReqToCallback: true });
  }

  validate(req: Request, username: string, password: string) {
    return this.authService.validateUser(username, password, clientIp(req));
  }
}
