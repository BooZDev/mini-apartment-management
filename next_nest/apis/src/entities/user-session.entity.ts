import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_sessions' })
export class UserSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'refresh_token_hash', type: 'char', length: 64 })
  refreshTokenHash: string;

  @Column({ name: 'previous_token_hash', type: 'char', length: 64, nullable: true })
  previousTokenHash: string | null;

  @Column({ name: 'rotated_at', type: 'timestamptz', nullable: true })
  rotatedAt: Date | null;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
