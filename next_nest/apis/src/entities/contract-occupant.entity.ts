import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Thời gian ở của một người theo một hợp đồng
@Entity({ name: 'contract_occupants' })
export class ContractOccupant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @Column({ name: 'occupant_id', type: 'uuid' })
  occupantId: string;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'relationship_to_primary', type: 'varchar', length: 50, nullable: true })
  relationshipToPrimary: string | null;

  @Column({ name: 'move_in_date', type: 'date' })
  moveInDate: string;

  @Column({ name: 'move_out_date', type: 'date', nullable: true })
  moveOutDate: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;
}
