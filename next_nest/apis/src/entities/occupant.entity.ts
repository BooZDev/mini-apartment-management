import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  Gender,
  ResidenceRegistrationStatus,
} from 'src/occupants/enums/occupant.enum';

@Entity({ name: 'occupants' })
export class Occupant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: Gender | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  hometown: string | null;

  // CCCD chỉ trả ở OCC-03, có ghi nhật ký
  @Column({ name: 'id_number', type: 'varchar', length: 12, nullable: true })
  idNumber: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({
    name: 'residence_registration_status',
    type: 'varchar',
    length: 20,
    default: ResidenceRegistrationStatus.NOT_REGISTERED,
  })
  residenceRegistrationStatus: ResidenceRegistrationStatus;

  // Tài khoản người thuê, chỉ có với người đứng tên
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'is_anonymized', type: 'boolean', default: false })
  isAnonymized: boolean;

  @Column({ name: 'anonymized_at', type: 'timestamptz', nullable: true })
  anonymizedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
