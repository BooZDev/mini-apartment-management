import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'charge_prices' })
export class ChargePrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'charge_type_id', type: 'uuid' })
  chargeTypeId: string;

  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice: number;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  // Đã dùng trong hóa đơn thì không sửa, không xóa
  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
