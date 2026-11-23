import { isIP } from 'node:net';
import type { Request } from 'express';

/**
 * IP của người gọi (đã tính TRUST_PROXY) để đếm đăng nhập sai. IPv4 dạng IPv6 đổi về IPv4;
 * IPv6 gộp theo dải /64 vì một máy thường giữ cả dải để đổi địa chỉ.
 */
export function clientIp(req: Request): string {
  const raw = (req.ip ?? req.socket?.remoteAddress ?? '').trim().toLowerCase();
  const ip = raw.startsWith('::ffff:') && isIP(raw.slice(7)) === 4 ? raw.slice(7) : raw;
  if (isIP(ip) === 6) {
    const groups = expandIpv6(ip);
    return `${groups.slice(0, 4).join(':')}::/64`;
  }
  return isIP(ip) === 4 ? ip : 'unknown';
}

function expandIpv6(ip: string): string[] {
  const [head, tail = ''] = ip.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const zeros = Array(8 - left.length - right.length).fill('0');
  return [...left, ...zeros, ...right].map((g) => g || '0');
}
