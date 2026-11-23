import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdjustmentsModule } from './adjustments/adjustments.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth/jwt-auth.guard';
import { RoleGuard } from './auth/guards/role/role.guard';
import { BillingSettingsModule } from './billing-settings/billing-settings.module';
import { BillingModule } from './billing/billing.module';
import { ChargeTypesModule } from './charge-types/charge-types.module';
import { typeOrmConfig } from './config/database.config';
import { validateEnv } from './config/env.validation';
import { ContractsModule } from './contracts/contracts.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HealthModule } from './health/health.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { InvoicesModule } from './invoices/invoices.module';
import { MeterReadingsModule } from './meter-readings/meter-readings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OccupantsModule } from './occupants/occupants.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { RoomsModule } from './rooms/rooms.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SearchModule } from './search/search.module';
import { TenantPortalModule } from './tenant-portal/tenant-portal.module';
import { TenantRequestsModule } from './tenant-requests/tenant-requests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
      cache: true,
    }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: typeOrmConfig }),
    // Giới hạn theo IP cho mọi route, lưu trong bộ nhớ
    ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }] }),
    AuditLogsModule,
    IdempotencyModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    ContractsModule,
    OccupantsModule,
    ChargeTypesModule,
    MeterReadingsModule,
    BillingModule,
    BillingSettingsModule,
    InvoicesModule,
    AdjustmentsModule,
    PaymentsModule,
    ReportsModule,
    ExpensesModule,
    SearchModule,
    TenantPortalModule,
    TenantRequestsModule,
    NotificationsModule,
    SchedulerModule,
    HealthModule,
  ],
  providers: [
    // Thứ tự: giới hạn theo IP, xác thực, vai trò
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RoleGuard },
  ],
})
export class AppModule {}
