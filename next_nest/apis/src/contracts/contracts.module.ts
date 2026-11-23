import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractOccupant } from 'src/entities/contract-occupant.entity';
import { ContractRenewal } from 'src/entities/contract-renewal.entity';
import { ContractService } from 'src/entities/contract-service.entity';
import { Contract } from 'src/entities/contract.entity';
import { Occupant } from 'src/entities/occupant.entity';
import { BillingModule } from 'src/billing/billing.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { SettlementService } from './settlement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contract, ContractRenewal, ContractService, ContractOccupant, Occupant]),
    BillingModule,
    NotificationsModule,
  ],
  controllers: [ContractsController],
  providers: [ContractsService, SettlementService],
  exports: [ContractsService],
})
export class ContractsModule {}
