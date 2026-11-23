import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BuildingSetting } from 'src/entities/building-setting.entity';
import { BillingSettingsController } from './billing-settings.controller';
import { BillingSettingsService } from './billing-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([BuildingSetting])],
  controllers: [BillingSettingsController],
  providers: [BillingSettingsService],
  exports: [BillingSettingsService],
})
export class BillingSettingsModule {}
