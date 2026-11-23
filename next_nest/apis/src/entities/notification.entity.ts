import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from 'src/notifications/enums/notification-type.enum';

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'related_type', type: 'varchar', length: 20, nullable: true })
  relatedType: 'INVOICE' | 'REQUEST' | null;

  @Column({ name: 'related_id', type: 'uuid', nullable: true })
  relatedId: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
