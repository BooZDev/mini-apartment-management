import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;
// bcrypt chỉ dùng 72 byte đầu
export const PASSWORD_MAX_BYTES = 72;

// Bỏ ký tự dễ nhầm khi đọc mật khẩu tạm: 0 O o 1 l I
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** 8 đến 72 ký tự (không quá 72 byte), có cả chữ và số. */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES &&
    /\p{L}/u.test(password) &&
    /\p{N}/u.test(password)
  );
}

/** Mật khẩu tạm ngẫu nhiên, luôn có cả chữ và số. */
export function generateTemporaryPassword(length = 12): string {
  const all = LETTERS + DIGITS;
  const chars = [LETTERS[randomInt(LETTERS.length)], DIGITS[randomInt(DIGITS.length)]];
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
