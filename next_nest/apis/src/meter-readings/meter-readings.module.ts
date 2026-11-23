import { Module } from '@nestjs/common';
import { BillingModule } from 'src/billing/billing.module';
import { MeterReadingsController } from './meter-readings.controller';
import { MeterReadingsService } from './meter-readings.service';

@Module({
  imports: [BillingModule],
  controllers: [MeterReadingsController],
  providers: [MeterReadingsService],
})
export class MeterReadingsModule {}
