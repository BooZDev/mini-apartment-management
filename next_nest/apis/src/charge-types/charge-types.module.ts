import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChargePrice } from 'src/entities/charge-price.entity';
import { ChargeType } from 'src/entities/charge-type.entity';
import { ChargeTypesController } from './charge-types.controller';
import { ChargeTypesService } from './charge-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChargeType, ChargePrice])],
  controllers: [ChargeTypesController],
  providers: [ChargeTypesService],
  exports: [ChargeTypesService],
})
export class ChargeTypesModule {}
