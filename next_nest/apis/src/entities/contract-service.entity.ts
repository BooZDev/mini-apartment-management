import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

// Dịch vụ không bắt buộc mà hợp đồng đăng ký (wifi, gửi xe...)
@Entity({ name: 'contract_services' })
export class ContractService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @Column({ name: 'charge_type_id', type: 'uuid' })
  chargeTypeId: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ name: 'from_period', type: 'char', length: 7 })
  fromPeriod: string;

  // null: đến khi hết hợp đồng
  @Column({ name: 'to_period', type: 'char', length: 7, nullable: true })
  toPeriod: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
