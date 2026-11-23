import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Chỉ thêm, không sửa, không xóa
@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ name: 'actor_username', type: 'varchar', length: 50 })
  actorUsername: string;

  @Column({ name: 'actor_full_name', type: 'varchar', length: 100 })
  actorFullName: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 30 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 255 })
  summary: string;

  @Column({ name: 'before_data', type: 'jsonb', nullable: true })
  beforeData: Record<string, unknown> | null;

  @Column({ name: 'after_data', type: 'jsonb', nullable: true })
  afterData: Record<string, unknown> | null;

  @Column({ name: 'request_id', type: 'varchar', length: 64, nullable: true })
  requestId: string | null;
}
