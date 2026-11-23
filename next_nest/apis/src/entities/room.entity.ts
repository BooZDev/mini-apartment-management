import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'rooms' })
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'smallint' })
  floor: number;

  @Column({ name: 'area_m2', type: 'numeric', precision: 6, scale: 2 })
  areaM2: number;

  @Column({ name: 'listed_price', type: 'bigint' })
  listedPrice: number;

  @Column({ name: 'is_under_maintenance', type: 'boolean', default: false })
  isUnderMaintenance: boolean;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
