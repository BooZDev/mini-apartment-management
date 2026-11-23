export type AuthJwtPayload = {
  // id tài khoản
  sub: string;
  // id phiên (user_sessions)
  sid: string;
  // users.session_version lúc cấp
  sv: number;
  iat?: number;
  exp?: number;
};
