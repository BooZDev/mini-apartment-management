import {
  comparePassword,
  generateTemporaryPassword,
  hashPassword,
  isStrongPassword,
} from '../password.util';

describe('password.util', () => {
  it('mật khẩu tạm 12 ký tự, có chữ và số, không có ký tự dễ nhầm', () => {
    for (let i = 0; i < 200; i++) {
      const p = generateTemporaryPassword();
      expect(p).toHaveLength(12);
      expect(p).toMatch(/[A-Za-z]/);
      expect(p).toMatch(/\d/);
      expect(p).not.toMatch(/[0O1lI]/);
      expect(isStrongPassword(p)).toBe(true);
    }
  });

  it('độ mạnh: 8 đến 72 byte, có cả chữ và số', () => {
    expect(isStrongPassword('MatKhau2026')).toBe(true);
    expect(isStrongPassword('Mk2026')).toBe(false);
    expect(isStrongPassword('chiconchu')).toBe(false);
    expect(isStrongPassword('12345678')).toBe(false);
    // 30 ký tự có dấu là 90 byte: bcrypt sẽ bỏ phần sau 72 byte nên không nhận
    expect(isStrongPassword('ệ'.repeat(30) + '1')).toBe(false);
  });

  it('băm và so mật khẩu', async () => {
    const hash = await hashPassword('MatKhau2026');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    await expect(comparePassword('MatKhau2026', hash)).resolves.toBe(true);
    await expect(comparePassword('matkhau2026', hash)).resolves.toBe(false);
  });

  it('so được mật khẩu băm cost 10 của dữ liệu mẫu', async () => {
    const seedHash = '$2a$10$Ygt8Y7ydhzmtkauYOQTof.jJ/GOWBIISkN40WzQzeQV3KoSbamARe';
    await expect(comparePassword('Abc@12345', seedHash)).resolves.toBe(true);
  });
});
