-- RLS bật, không có policy: API tự động của Supabase (anon, authenticated) không đọc, ghi được.
-- NestJS kết nối bằng vai trò postgres (chủ bảng) nên không bị RLS chặn.

alter table public.users                         enable row level security;
alter table public.user_roles                    enable row level security;
alter table public.building_settings             enable row level security;
alter table public.rooms                         enable row level security;
alter table public.occupants                     enable row level security;
alter table public.contracts                     enable row level security;
alter table public.contract_renewals             enable row level security;
alter table public.contract_occupants            enable row level security;
alter table public.charge_types                  enable row level security;
alter table public.charge_prices                 enable row level security;
alter table public.contract_services             enable row level security;
alter table public.meter_readings                enable row level security;
alter table public.billing_periods               enable row level security;
alter table public.extra_charges                 enable row level security;
alter table public.invoices                      enable row level security;
alter table public.invoice_lines                 enable row level security;
alter table public.invoice_adjustments           enable row level security;
alter table public.payments                      enable row level security;
alter table public.payment_cancellation_requests enable row level security;
alter table public.tenant_requests               enable row level security;
alter table public.expense_categories            enable row level security;
alter table public.expenses                      enable row level security;
alter table public.notifications                 enable row level security;
alter table public.audit_logs                    enable row level security;
alter table public.idempotency_keys              enable row level security;
alter table public.login_attempts                enable row level security;

-- Thu hồi quyền của các vai trò API công khai (chỉ có trên Supabase)
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke execute on all functions in schema public from %I', r);
      execute format('alter default privileges for role postgres in schema public revoke all on tables from %I', r);
      execute format('alter default privileges for role postgres in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges for role postgres in schema public revoke execute on functions from %I', r);
    end if;
  end loop;
end $$;
