// ACTIVE, LOCKED lưu ở CSDL; READ_ONLY (người thuê sau khi hợp đồng kết thúc) tính khi đọc
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  READ_ONLY = 'READ_ONLY',
  LOCKED = 'LOCKED',
}
