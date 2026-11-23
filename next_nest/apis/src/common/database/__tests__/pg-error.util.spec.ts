import { QueryFailedError } from 'typeorm';
import { mapPgError } from '../pg-error.util';

const pg = (code: string, extra: Record<string, string> = {}) =>
  new QueryFailedError('select 1', [], Object.assign(new Error(extra.message ?? 'x'), { code, ...extra }));

describe('mapPgError', () => {
  it('trigger báo mã nghiệp vụ (P0001): dùng nguyên mã', () => {
    expect(mapPgError(pg('P0001', { message: 'ID_NUMBER_TAKEN' }))?.code).toBe('ID_NUMBER_TAKEN');
    expect(mapPgError(pg('P0001', { message: 'ROOM_HAS_ACTIVE_CONTRACT' }))?.getStatus()).toBe(409);
  });

  it('mã lỗi lập trình hoặc mã lạ từ trigger: không trả ra ngoài (500)', () => {
    expect(mapPgError(pg('P0001', { message: 'IMMUTABLE_RECORD' }))).toBeNull();
    expect(mapPgError(pg('P0001', { message: 'select * from users' }))).toBeNull();
  });

  it('vi phạm ràng buộc theo tên', () => {
    expect(mapPgError(pg('23505', { constraint: 'users_username_uk' }))?.code).toBe('USERNAME_TAKEN');
    expect(mapPgError(pg('23P01', { constraint: 'contracts_period_overlap' }))?.code).toBe(
      'CONTRACT_PERIOD_OVERLAP',
    );
    expect(mapPgError(pg('23505', { constraint: 'khong_biet' }))).toBeNull();
  });

  it('CHECK, khóa ngoại, xung đột ghi đồng thời', () => {
    expect(mapPgError(pg('23514', { constraint: 'rooms_area_range' }))?.code).toBe('VALIDATION_ERROR');
    expect(mapPgError(pg('23503'))?.code).toBe('RESOURCE_NOT_FOUND');
    expect(mapPgError(pg('40P01'))?.code).toBe('CONCURRENT_UPDATE');
  });

  it('lỗi không phải của PostgreSQL', () => {
    expect(mapPgError(new Error('boom'))).toBeNull();
  });
});
