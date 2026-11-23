import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'contracts' })
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @Column({ name: 'contract_number', type: 'varchar', length: 50, nullable: true })
  contractNumber: string | null;

  @Column({ name: 'signed_on', type: 'date' })
  signedOn: string;

  @Column({ name: 'primary_occupant_id', type: 'uuid' })
  primaryOccupantId: string;

  @Column({ name: 'tenant_user_id', type: 'uuid' })
  tenantUserId: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'monthly_rent', type: 'bigint' })
  monthlyRent: number;

  @Column({ type: 'bigint', default: 0 })
  deposit: number;

  @Column({ name: 'initial_electricity_reading', type: 'integer', nullable: true })
  initialElectricityReading: number | null;

  @Column({ name: 'initial_water_reading', type: 'integer', nullable: true })
  initialWaterReading: number | null;

  @Column({ name: 'ended_on', type: 'date', nullable: true })
  endedOn: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'end_note', type: 'text', nullable: true })
  endNote: string | null;

  @Column({ name: 'final_electricity_reading', type: 'integer', nullable: true })
  finalElectricityReading: number | null;

  @Column({ name: 'final_water_reading', type: 'integer', nullable: true })
  finalWaterReading: number | null;

  @Column({ name: 'deposit_refund_amount', type: 'bigint', nullable: true })
  depositRefundAmount: number | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
