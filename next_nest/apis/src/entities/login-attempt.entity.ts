import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'login_attempts' })
export class LoginAttempt {
  @PrimaryColumn({ name: 'username_normalized', type: 'varchar', length: 50 })
  usernameNormalized: string;

  @PrimaryColumn({ name: 'client_ip', type: 'varchar', length: 64 })
  clientIp: string;

  @Column({ name: 'failed_count', type: 'smallint', default: 0 })
  failedCount: number;

  @Column({ name: 'first_failed_at', type: 'timestamptz' })
  firstFailedAt: Date;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;
}
