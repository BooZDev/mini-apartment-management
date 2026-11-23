import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

// Thiếu hoặc sai biến nào thì app không khởi động, kèm tên biến
export class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3001;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, { message: 'DATABASE_URL phải bắt đầu bằng postgres:// hoặc postgresql://' })
  DATABASE_URL: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  DATABASE_SSL?: 'true' | 'false';

  // Chứng chỉ CA (PEM) để kiểm tra máy chủ CSDL
  @IsOptional()
  @IsString()
  DATABASE_SSL_CA?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  DATABASE_POOL_MAX = 10;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET cần ít nhất 32 ký tự' })
  JWT_SECRET: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  COOKIE_SECURE: 'true' | 'false' = 'true';

  @IsOptional()
  @IsString()
  CORS_ORIGINS = 'http://localhost:3000';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5)
  TRUST_PROXY = 0;

  @IsOptional()
  @IsIn(['true', 'false'])
  SWAGGER?: 'true' | 'false';

  // Tác vụ định kỳ (thông báo hạn thanh toán, dọn phiên hết hạn)
  @IsOptional()
  @IsIn(['true', 'false'])
  SCHEDULER: 'true' | 'false' = 'true';
}

export function validateEnv(raw: Record<string, unknown>) {
  // Dòng để trống trong .env coi như chưa đặt
  const notEmpty = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== ''));
  const config = plainToInstance(EnvironmentVariables, notEmpty, { enableImplicitConversion: true });
  const errors = validateSync(config, { skipMissingProperties: false });

  if (errors.length > 0) {
    const detail = errors.map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`).join('\n');
    throw new Error(`Cấu hình môi trường không hợp lệ:\n${detail}`);
  }
  if (config.NODE_ENV === 'production' && config.COOKIE_SECURE === 'false') {
    throw new Error('COOKIE_SECURE không được tắt ở production');
  }
  return config;
}
