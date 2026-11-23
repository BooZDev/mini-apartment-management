import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  username: string;

  // Không bao giờ trả ra API
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  // Chỉ lưu khóa tay; READ_ONLY của người thuê tính khi đọc
  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status: 'ACTIVE' | 'LOCKED';

  @Column({ name: 'must_change_password', type: 'boolean', default: true })
  mustChangePassword: boolean;

  // Tăng khi đổi, đặt lại mật khẩu hoặc khóa: phiên mang số cũ hết hiệu lực
  @Column({ name: 'session_version', type: 'integer', default: 0 })
  sessionVersion: number;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
