import './pg-types';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EnvironmentVariables } from './env.validation';

function sslOptions(config: ConfigService<EnvironmentVariables, true>) {
  const ssl = config.get('DATABASE_SSL', { infer: true });
  const ca = config.get('DATABASE_SSL_CA', { infer: true });

  if (ssl === undefined) return undefined;
  if (ssl === 'false') return false;
  if (ca) return { ca, rejectUnauthorized: true };

  new Logger('Database').warn('Chưa có DATABASE_SSL_CA: kết nối mã hóa nhưng không kiểm tra chứng chỉ máy chủ CSDL');
  return { rejectUnauthorized: false };
}

export function typeOrmConfig(config: ConfigService<EnvironmentVariables, true>): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: config.get('DATABASE_URL', { infer: true }),
    ssl: sslOptions(config),
    autoLoadEntities: true,
    // Lược đồ do migration của supabase/ quản lý
    synchronize: false,
    migrationsRun: false,
    // Không log câu lệnh: tham số có mật khẩu băm, dữ liệu cá nhân
    logging: false,
    extra: {
      max: config.get('DATABASE_POOL_MAX', { infer: true }),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 15_000,
      application_name: 'next-nest-apis',
    },
  };
}
