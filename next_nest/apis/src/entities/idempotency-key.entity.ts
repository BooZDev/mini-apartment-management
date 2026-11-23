import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'idempotency_keys' })
export class IdempotencyKey {
  @PrimaryColumn({ type: 'uuid' })
  key: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  endpoint: string;

  @Column({ name: 'request_hash', type: 'char', length: 64 })
  requestHash: string;

  @Column({ name: 'response_status', type: 'smallint' })
  responseStatus: number;

  @Column({ name: 'response_body', type: 'jsonb' })
  responseBody: unknown;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', insert: false, update: false })
  expiresAt: Date;
}
