import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginAttempt } from 'src/entities/login-attempt.entity';
import { UserSession } from 'src/entities/user-session.entity';
import { UsersModule } from 'src/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import jwtConfig from './config/jwt.config';
import sessionConfig from './config/session.config';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';
import { RoleGuard } from './guards/role/role.guard';
import { LoginAttemptsService } from './services/login-attempts.service';
import { SessionService } from './services/session.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoginAttempt, UserSession]),
    PassportModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(sessionConfig),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, LoginAttemptsService, LocalStrategy, JwtStrategy, JwtAuthGuard, RoleGuard],
  exports: [SessionService, JwtAuthGuard, RoleGuard],
})
export class AuthModule {}
