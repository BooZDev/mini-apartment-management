import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractOccupant } from 'src/entities/contract-occupant.entity';
import { Occupant } from 'src/entities/occupant.entity';
import { OccupantsController } from './occupants.controller';
import { OccupantsService } from './occupants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Occupant, ContractOccupant])],
  controllers: [OccupantsController],
  providers: [OccupantsService],
  exports: [OccupantsService],
})
export class OccupantsModule {}
