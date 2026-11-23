import { addDays } from 'src/common/utils/date.util';
import { UserStatus } from '../enums/user-status.enum';

export const TENANT_READ_ONLY_DAYS = 30;

// Khóa tay thì LOCKED; người thuê có hợp đồng đã kết thúc: READ_ONLY đến hết endedOn + 30, sau đó LOCKED
export function resolveAccountStatus(
  storedStatus: string,
  contractEndedOn: string | null,
  today: string,
): { status: UserStatus; readOnlyUntil: string | null } {
  const readOnlyUntil = contractEndedOn ? addDays(contractEndedOn, TENANT_READ_ONLY_DAYS) : null;

  if (storedStatus === 'LOCKED') return { status: UserStatus.LOCKED, readOnlyUntil };
  if (readOnlyUntil === null) return { status: UserStatus.ACTIVE, readOnlyUntil };
  return {
    status: today > readOnlyUntil ? UserStatus.LOCKED : UserStatus.READ_ONLY,
    readOnlyUntil,
  };
}

// Cùng quy tắc bằng SQL, để lọc danh sách
export function accountStatusSql(todayParam: string) {
  return `(case when u.status = 'LOCKED' then 'LOCKED'
                when tc.ended_on is not null and ${todayParam}::date > tc.ended_on + ${TENANT_READ_ONLY_DAYS} then 'LOCKED'
                when tc.ended_on is not null then 'READ_ONLY'
                else 'ACTIVE' end)`;
}
