import { UserStatus } from '../../enums/user-status.enum';
import { resolveAccountStatus } from '../account-status.util';

describe('resolveAccountStatus', () => {
  it('khóa tay luôn là LOCKED', () => {
    expect(resolveAccountStatus('LOCKED', null, '2026-11-18').status).toBe(UserStatus.LOCKED);
  });

  it('chưa có hợp đồng kết thúc: ACTIVE', () => {
    expect(resolveAccountStatus('ACTIVE', null, '2026-11-18')).toEqual({
      status: UserStatus.ACTIVE,
      readOnlyUntil: null,
    });
  });

  it('người thuê: chỉ đọc đến hết ngày endedOn + 30, sau đó LOCKED', () => {
    expect(resolveAccountStatus('ACTIVE', '2026-11-10', '2026-12-10')).toEqual({
      status: UserStatus.READ_ONLY,
      readOnlyUntil: '2026-12-10',
    });
    expect(resolveAccountStatus('ACTIVE', '2026-11-10', '2026-12-11').status).toBe(UserStatus.LOCKED);
  });
});
