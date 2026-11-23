import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CalculationMethod } from 'src/charge-types/enums/calculation-method.enum';
import { MeterType } from 'src/contracts/enums/contract.enum';

@Entity({ name: 'charge_types' })
export class ChargeType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'calculation_method', type: 'varchar', length: 20 })
  calculationMethod: CalculationMethod;

  @Column({ name: 'meter_type', type: 'varchar', length: 20, nullable: true })
  meterType: MeterType | null;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
