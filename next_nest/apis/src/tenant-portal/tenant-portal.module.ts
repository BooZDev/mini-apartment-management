import { Module } from '@nestjs/common';
import { ContractsModule } from 'src/contracts/contracts.module';
import { InvoicesModule } from 'src/invoices/invoices.module';
import { PaymentsModule } from 'src/payments/payments.module';
import { TenantRequestsModule } from 'src/tenant-requests/tenant-requests.module';
import { TenantPortalController } from './tenant-portal.controller';
import { TenantPortalService } from './tenant-portal.service';

@Module({
  imports: [ContractsModule, InvoicesModule, PaymentsModule, TenantRequestsModule],
  controllers: [TenantPortalController],
  providers: [TenantPortalService],
})
export class TenantPortalModule {}
