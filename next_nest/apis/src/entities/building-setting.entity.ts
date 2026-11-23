import { Column, Entity, PrimaryColumn } from 'typeorm';

// Một dòng duy nhất (id = 1)
@Entity({ name: 'building_settings' })
export class BuildingSetting {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ name: 'building_name', type: 'varchar', length: 100 })
  buildingName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'default_billing_day', type: 'smallint' })
  defaultBillingDay: number;

  @Column({ name: 'default_payment_term_days', type: 'smallint' })
  defaultPaymentTermDays: number;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', insert: false, update: false })
  updatedAt: Date;
}
