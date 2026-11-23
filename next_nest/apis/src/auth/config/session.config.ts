import { registerAs } from '@nestjs/config';

export default registerAs('session', () => {
  const secure = process.env.COOKIE_SECURE !== 'false';
  return {
    secure,
    // Tiền tố __Host-, __Secure- buộc trình duyệt chỉ nhận cookie qua HTTPS
    accessCookie: secure ? '__Host-access' : 'access_token',
    refreshCookie: secure ? '__Secure-refresh' : 'refresh_token',
    // Refresh token chỉ gửi kèm các route /auth
    refreshPath: '/api/v1/auth',
    accessSeconds: 15 * 60,
    // Đặc tả 2.6: hết hạn sau 30 phút không hoạt động, tối đa 12 giờ từ khi đăng nhập
    idleSeconds: 30 * 60,
    maxSeconds: 12 * 60 * 60,
    // Hai tab làm mới cùng lúc bằng cùng một token: không coi là token bị đánh cắp
    reuseGraceSeconds: 15,
  };
});
