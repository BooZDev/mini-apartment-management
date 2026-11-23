import { EntityManager } from 'typeorm';

// Hủy phiên đăng nhập: khóa tài khoản, đặt lại mật khẩu (mọi phiên); đổi mật khẩu (trừ phiên hiện tại)
export async function revokeUserSessions(
  manager: EntityManager,
  userId: string,
  exceptSessionId: string | null = null,
) {
  await manager.query(
    `update public.user_sessions set revoked_at = now()
      where user_id = $1 and revoked_at is null and id is distinct from $2::uuid`,
    [userId, exceptSessionId],
  );
}
