import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Lịch sử gia hạn, không sửa, không xóa
@Entity({ name: 'contract_renewals' })
export class ContractRenewal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @Column({ name: 'addendum_number', type: 'varchar', length: 50, nullable: true })
  addendumNumber: string | null;

  @Column({ name: 'signed_on', type: 'date' })
  signedOn: string;

  @Column({ name: 'previous_end_date', type: 'date' })
  previousEndDate: string;

  @Column({ name: 'new_end_date', type: 'date' })
  newEndDate: string;

  // Giá thuê mới, null nếu giữ giá cũ
  @Column({ name: 'monthly_rent', type: 'bigint', nullable: true })
  monthlyRent: number | null;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
