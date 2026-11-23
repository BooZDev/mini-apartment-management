import { Module } from '@nestjs/common';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { BillingCalculatorService } from './billing-calculator.service';
import { BillingPeriodsController } from './billing-periods.controller';
import { BillingPeriodsService } from './billing-periods.service';

@Module({
  imports: [NotificationsModule],
  controllers: [BillingPeriodsController],
  providers: [BillingCalculatorService, BillingPeriodsService],
  exports: [BillingCalculatorService],
})
export class BillingModule {}
