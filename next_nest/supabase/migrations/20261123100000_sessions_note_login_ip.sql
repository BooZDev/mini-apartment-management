-- Phiên đăng nhập (refresh token), ghi chú hợp đồng, chặn đăng nhập sai theo tên đăng nhập và IP

-- E01: mỗi lần đăng nhập một phiên; chỉ lưu mã băm SHA-256 của refresh token
create table public.user_sessions (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references public.users (id) on delete cascade,
  refresh_token_hash   char(64)    not null,
  -- Token liền trước: nhận ra token cũ bị dùng lại sau khi xoay vòng
  previous_token_hash  char(64),
  rotated_at           timestamptz,
  last_seen_at         timestamptz not null default now(),
  expires_at           timestamptz not null,
  revoked_at           timestamptz,
  created_at           timestamptz not null default now(),
  constraint user_sessions_hash      check (refresh_token_hash ~ '^[0-9a-f]{64}$'),
  constraint user_sessions_prev_hash check (previous_token_hash is null or previous_token_hash ~ '^[0-9a-f]{64}$'),
  constraint user_sessions_expiry    check (expires_at > created_at)
);
create index user_sessions_user_idx on public.user_sessions (user_id) where revoked_at is null;
create index user_sessions_expires_idx on public.user_sessions (expires_at);

-- E06: ghi chú khi nhập, sửa hợp đồng (CTR-02, CTR-06)
alter table public.contracts add column note text;
alter table public.contracts add constraint contracts_note_len check (note is null or char_length(note) <= 500);

-- Chặn theo cặp (tên đăng nhập, IP): người khác biết tên không khóa được chủ tài khoản ở máy khác
alter table public.login_attempts add column client_ip varchar(64) not null default '';
alter table public.login_attempts alter column client_ip drop default;
alter table public.login_attempts drop constraint login_attempts_pkey;
alter table public.login_attempts add primary key (username_normalized, client_ip);

alter table public.user_sessions enable row level security;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.user_sessions from %I', r);
    end if;
  end loop;
end $$;
