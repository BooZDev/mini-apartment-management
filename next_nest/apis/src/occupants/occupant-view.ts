import { EntityManager } from 'typeorm';
import { Role } from 'src/auth/enums/role.enum';
import { selectRows } from 'src/common/database/query.util';
import { Gender, ResidenceRegistrationStatus } from './enums/occupant.enum';

/**
 * Lọc trường cá nhân theo vai trò (đặc tả 2.6), lấy mức cao nhất tài khoản có:
 * FULL (MANAGER), BASIC (ACCOUNTANT: id, roomCode, fullName, isPrimary),
 * NAME_ONLY (TENANT: fullName, isPrimary), NONE (OWNER: chỉ số liệu tổng hợp).
 */
export type OccupantVisibility = 'FULL' | 'BASIC' | 'NAME_ONLY' | 'NONE';

export function occupantVisibility(roles: Role[]): OccupantVisibility {
  if (roles.includes(Role.MANAGER)) return 'FULL';
  if (roles.includes(Role.ACCOUNTANT)) return 'BASIC';
  if (roles.includes(Role.TENANT)) return 'NAME_ONLY';
  return 'NONE';
}

export type OccupantRow = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: Gender | null;
  hometown: string | null;
  id_number: string | null;
  phone: string | null;
  email: string | null;
  residence_registration_status: ResidenceRegistrationStatus;
  user_id: string | null;
  is_anonymized: boolean;
  note: string | null;
  stay_id: string;
  contract_id: string;
  is_primary: boolean;
  relationship_to_primary: string | null;
  move_in_date: string;
  move_out_date: string | null;
  room_id: string;
  room_code: string;
};

export const OCCUPANT_SELECT = `
  select o.id, o.full_name, o.date_of_birth, o.gender, o.hometown, o.id_number, o.phone, o.email,
         o.residence_registration_status, o.user_id, o.is_anonymized, o.note,
         co.id as stay_id, co.contract_id, co.is_primary, co.relationship_to_primary,
         co.move_in_date, co.move_out_date, c.room_id, r.code as room_code
    from public.contract_occupants co
    join public.occupants o on o.id = co.occupant_id
    join public.contracts c on c.id = co.contract_id
    join public.rooms r on r.id = c.room_id`;

const OCCUPANT_ORDER = 'order by co.is_primary desc, co.move_in_date, o.full_name, o.id';

export function findOccupantsOfContracts(
  manager: EntityManager,
  contractIds: string[],
  includeMovedOut: boolean,
) {
  if (contractIds.length === 0) return Promise.resolve([] as OccupantRow[]);
  return selectRows<OccupantRow>(
    manager,
    `${OCCUPANT_SELECT}
      where co.contract_id = any($1::uuid[])
        ${includeMovedOut ? '' : 'and co.move_out_date is null'}
      ${OCCUPANT_ORDER}`,
    [contractIds],
  );
}

export function toOccupantSummary(r: OccupantRow, visibility: OccupantVisibility) {
  if (visibility === 'NAME_ONLY') return { fullName: r.full_name, isPrimary: r.is_primary };
  if (visibility === 'BASIC') {
    return { id: r.id, roomCode: r.room_code, fullName: r.full_name, isPrimary: r.is_primary };
  }
  return {
    id: r.id,
    roomId: r.room_id,
    roomCode: r.room_code,
    contractId: r.contract_id,
    fullName: r.full_name,
    isPrimary: r.is_primary,
    relationshipToPrimary: r.is_primary ? null : r.relationship_to_primary,
    phone: r.is_anonymized ? null : r.phone,
    moveInDate: r.move_in_date,
    moveOutDate: r.move_out_date,
    residenceRegistrationStatus: r.residence_registration_status,
  };
}

// Chỉ MANAGER; người đã ẩn dữ liệu cá nhân chỉ còn họ tên
export function toOccupantDetail(r: OccupantRow) {
  const hidden = r.is_anonymized;
  return {
    ...toOccupantSummary(r, 'FULL'),
    dateOfBirth: hidden ? null : r.date_of_birth,
    gender: hidden ? null : r.gender,
    hometown: hidden ? null : r.hometown,
    idNumber: hidden ? null : r.id_number,
    email: hidden ? null : r.email,
    note: hidden ? null : r.note,
    userId: r.user_id,
  };
}
