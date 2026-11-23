-- Lược đồ CSDL theo report/db/db.md. Tiền: số nguyên đồng. Ngày nghiệp vụ theo giờ Việt Nam.
-- Trạng thái suy ra (phòng VACANT/OCCUPIED, hợp đồng UPCOMING/ACTIVE, hóa đơn OVERDUE, người thuê READ_ONLY) không lưu cột.

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

do $$
begin
  execute format('alter database %I set timezone to %L', current_database(), 'Asia/Ho_Chi_Minh');
end $$;

-- Ngày hôm nay theo giờ Việt Nam, dùng cho các ràng buộc "không sau hôm nay"
create or replace function public.vn_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date $$;

-- E01, E02: tài khoản, vai trò
create table public.users (
  id                    uuid primary key default gen_random_uuid(),
  username              varchar(50)  not null,
  password_hash         varchar(255) not null,
  full_name             varchar(100) not null,
  phone                 varchar(15),
  email                 varchar(150),
  status                varchar(20)  not null default 'ACTIVE',
  must_change_password  boolean      not null default true,
  session_version       integer      not null default 0,
  last_login_at         timestamptz,
  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now(),
  constraint users_username_format check (username ~ '^[A-Za-z0-9._]{3,50}$'),
  constraint users_full_name_len   check (char_length(btrim(full_name)) between 1 and 100),
  constraint users_phone_format    check (phone is null or phone ~ '^0[0-9]{9}$'),
  constraint users_email_format    check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint users_status_check    check (status in ('ACTIVE', 'LOCKED')),
  constraint users_session_version check (session_version >= 0)
);
-- UK-01 -> USERNAME_TAKEN
create unique index users_username_uk on public.users (lower(username));

create table public.user_roles (
  user_id      uuid        not null references public.users (id) on delete restrict,
  role         varchar(20) not null,
  assigned_by  uuid        references public.users (id),
  assigned_at  timestamptz not null default now(),
  primary key (user_id, role),
  constraint user_roles_role_check check (role in ('SYSTEM_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT', 'TENANT'))
);

-- E03: cấu hình tòa nhà (một dòng duy nhất)
create table public.building_settings (
  id                         smallint     primary key default 1,
  building_name              varchar(100) not null default 'BlueMoon',
  address                    varchar(255),
  default_billing_day        smallint     not null default 1,
  default_payment_term_days  smallint     not null default 10,
  rounding_unit              integer      not null default 1000,
  rounding_mode              varchar(20)  not null default 'NEAREST',
  updated_by                 uuid         references public.users (id),
  updated_at                 timestamptz  not null default now(),
  -- CK-01
  constraint building_settings_single_row  check (id = 1),
  constraint building_settings_billing_day check (default_billing_day between 1 and 31),
  constraint building_settings_term_days   check (default_payment_term_days between 0 and 60),
  constraint building_settings_rounding    check (rounding_unit = 1000 and rounding_mode = 'NEAREST')
);

-- E04: phòng
create table public.rooms (
  id                    uuid          primary key default gen_random_uuid(),
  code                  varchar(20)   not null,
  floor                 smallint      not null,
  area_m2               numeric(6, 2) not null,
  listed_price          bigint        not null,
  is_under_maintenance  boolean       not null default false,
  note                  text,
  created_at            timestamptz   not null default now(),
  updated_at            timestamptz   not null default now(),
  constraint rooms_code_format   check (code ~ '^[A-Za-z0-9-]{1,20}$'),
  -- CK-02
  constraint rooms_floor_range   check (floor between 0 and 100),
  constraint rooms_area_range    check (area_m2 > 0 and area_m2 <= 1000),
  constraint rooms_listed_price  check (listed_price >= 0)
);
-- UK-02 -> ROOM_CODE_TAKEN
create unique index rooms_code_uk on public.rooms (upper(code));

-- E05: người ở
create table public.occupants (
  id                             uuid         primary key default gen_random_uuid(),
  full_name                      varchar(100) not null,
  date_of_birth                  date,
  gender                         varchar(10),
  hometown                       varchar(200),
  id_number                      varchar(12),
  phone                          varchar(15),
  email                          varchar(150),
  residence_registration_status  varchar(20)  not null default 'NOT_REGISTERED',
  user_id                        uuid         unique references public.users (id),
  is_anonymized                  boolean      not null default false,
  anonymized_at                  timestamptz,
  note                           text,
  created_at                     timestamptz  not null default now(),
  updated_at                     timestamptz  not null default now(),
  constraint occupants_full_name_len  check (char_length(btrim(full_name)) between 1 and 100),
  constraint occupants_gender_check   check (gender is null or gender in ('MALE', 'FEMALE', 'OTHER')),
  constraint occupants_id_number_fmt  check (id_number is null or id_number ~ '^[0-9]{12}$'),
  constraint occupants_phone_format   check (phone is null or phone ~ '^0[0-9]{9}$'),
  constraint occupants_email_format   check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint occupants_residence_chk  check (residence_registration_status in ('NOT_REGISTERED', 'REGISTERED')),
  -- CK-03
  constraint occupants_required_info  check (
    (not is_anonymized and date_of_birth is not null and hometown is not null and id_number is not null)
    or (is_anonymized and anonymized_at is not null)
  )
);
create index occupants_id_number_idx on public.occupants (id_number) where id_number is not null;

-- E06: hợp đồng, gia hạn
create table public.contracts (
  id                           uuid        primary key default gen_random_uuid(),
  room_id                      uuid        not null references public.rooms (id) on delete restrict,
  contract_number              varchar(50),
  signed_on                    date        not null,
  primary_occupant_id          uuid        not null references public.occupants (id) on delete restrict,
  tenant_user_id               uuid        not null references public.users (id) on delete restrict,
  start_date                   date        not null,
  end_date                     date        not null,
  monthly_rent                 bigint      not null,
  deposit                      bigint      not null default 0,
  initial_electricity_reading  integer,
  initial_water_reading        integer,
  ended_on                     date,
  end_note                     text,
  -- Thanh lý khi kết thúc: chỉ số trả phòng, số tiền cọc trả lại người thuê
  final_electricity_reading    integer,
  final_water_reading          integer,
  deposit_refund_amount        bigint,
  created_by                   uuid        not null references public.users (id),
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  constraint contracts_number_len     check (contract_number is null or char_length(btrim(contract_number)) between 1 and 50),
  constraint contracts_signed_on      check (signed_on <= public.vn_today()),
  -- CK-04
  constraint contracts_end_after_start check (end_date > start_date),
  constraint contracts_monthly_rent    check (monthly_rent > 0),
  constraint contracts_deposit         check (deposit >= 0),
  constraint contracts_initial_elec    check (initial_electricity_reading is null or initial_electricity_reading >= 0),
  constraint contracts_initial_water   check (initial_water_reading is null or initial_water_reading >= 0),
  constraint contracts_settlement_only_when_ended check (
    ended_on is not null
    or (final_electricity_reading is null and final_water_reading is null and deposit_refund_amount is null)
  ),
  constraint contracts_final_elec      check (final_electricity_reading is null
                                              or final_electricity_reading >= coalesce(initial_electricity_reading, 0)),
  constraint contracts_final_water     check (final_water_reading is null
                                              or final_water_reading >= coalesce(initial_water_reading, 0)),
  constraint contracts_deposit_refund  check (deposit_refund_amount is null or deposit_refund_amount between 0 and deposit),
  -- IR-01 -> CONTRACT_PERIOD_OVERLAP; hủy trước khi vào ở (ended_on < start_date) không chiếm khoảng nào
  constraint contracts_period_overlap exclude using gist (
    room_id with =,
    (case
       when ended_on is not null and ended_on < start_date then 'empty'::daterange
       else daterange(start_date, coalesce(ended_on, end_date), '[]')
     end) with &&
  )
);
-- UK-13 -> CONTRACT_NUMBER_TAKEN
create unique index contracts_contract_number_uk on public.contracts (contract_number) where contract_number is not null;
create index contracts_room_idx on public.contracts (room_id);
create index contracts_tenant_user_idx on public.contracts (tenant_user_id);
create index contracts_primary_occupant_idx on public.contracts (primary_occupant_id);

create table public.contract_renewals (
  id                 uuid        primary key default gen_random_uuid(),
  contract_id        uuid        not null references public.contracts (id) on delete restrict,
  addendum_number    varchar(50),
  signed_on          date        not null,
  previous_end_date  date        not null,
  new_end_date       date        not null,
  monthly_rent       bigint,
  effective_from     date        not null,
  note               text,
  created_by         uuid        not null references public.users (id),
  created_at         timestamptz not null default now(),
  constraint contract_renewals_addendum_len check (addendum_number is null or char_length(btrim(addendum_number)) between 1 and 50),
  constraint contract_renewals_signed_on    check (signed_on <= public.vn_today()),
  constraint contract_renewals_new_end      check (new_end_date > previous_end_date),
  constraint contract_renewals_rent         check (monthly_rent is null or monthly_rent > 0),
  constraint contract_renewals_effective    check (effective_from = previous_end_date + 1)
);
create index contract_renewals_contract_idx on public.contract_renewals (contract_id, effective_from);

-- E07: người ở theo hợp đồng
create table public.contract_occupants (
  id                       uuid        primary key default gen_random_uuid(),
  contract_id              uuid        not null references public.contracts (id) on delete restrict,
  occupant_id              uuid        not null references public.occupants (id) on delete restrict,
  is_primary               boolean     not null default false,
  relationship_to_primary  varchar(50),
  move_in_date             date        not null,
  move_out_date            date,
  note                     text,
  -- CK-05
  constraint contract_occupants_dates check (move_out_date is null or move_out_date >= move_in_date)
);
-- UK-11: mỗi hợp đồng đúng một người đứng tên
create unique index contract_occupants_primary_uk on public.contract_occupants (contract_id) where is_primary;
create index contract_occupants_contract_idx on public.contract_occupants (contract_id);
create index contract_occupants_occupant_idx on public.contract_occupants (occupant_id);

-- E08, E09, E10: khoản thu, đơn giá, dịch vụ đăng ký
create table public.charge_types (
  id                  uuid        primary key default gen_random_uuid(),
  name                varchar(50) not null,
  calculation_method  varchar(20) not null,
  meter_type          varchar(20),
  unit                varchar(20) not null,
  is_mandatory        boolean     not null default true,
  is_active           boolean     not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- CK-06
  constraint charge_types_name_len   check (char_length(btrim(name)) between 1 and 50),
  constraint charge_types_method     check (calculation_method in ('CONTRACT_RENT', 'METER', 'PER_PERSON', 'PER_ROOM', 'PER_VEHICLE', 'MANUAL')),
  constraint charge_types_meter_type check (meter_type is null or meter_type in ('ELECTRICITY', 'WATER')),
  constraint charge_types_meter_iff  check ((calculation_method = 'METER') = (meter_type is not null))
);
-- UK-03 -> CHARGE_NAME_TAKEN
create unique index charge_types_name_uk on public.charge_types (lower(name));
-- UK-05 -> METER_TYPE_IN_USE: mỗi loại công tơ chỉ một khoản thu đang dùng
create unique index charge_types_active_meter_uk on public.charge_types (meter_type) where calculation_method = 'METER' and is_active;
-- UK-14: chỉ một khoản "Tiền phòng" của hệ thống
create unique index charge_types_contract_rent_uk on public.charge_types (calculation_method) where calculation_method = 'CONTRACT_RENT';

create table public.charge_prices (
  id              uuid        primary key default gen_random_uuid(),
  charge_type_id  uuid        not null references public.charge_types (id) on delete restrict,
  unit_price      bigint      not null,
  effective_from  date        not null,
  is_used         boolean     not null default false,
  created_by      uuid        not null references public.users (id),
  created_at      timestamptz not null default now(),
  -- CK-07
  constraint charge_prices_unit_price check (unit_price between 0 and 1000000000)
);
-- UK-04 -> PRICE_EFFECTIVE_DATE_TAKEN
create unique index charge_prices_type_effective_uk on public.charge_prices (charge_type_id, effective_from);

create table public.contract_services (
  id              uuid        primary key default gen_random_uuid(),
  contract_id     uuid        not null references public.contracts (id) on delete cascade,
  charge_type_id  uuid        not null references public.charge_types (id) on delete restrict,
  quantity        integer     not null default 1,
  from_period     char(7)     not null,
  to_period       char(7),
  updated_at      timestamptz not null default now(),
  constraint contract_services_from_fmt check (from_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint contract_services_to_fmt   check (to_period is null or to_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  -- CK-08
  constraint contract_services_quantity check (quantity >= 1),
  constraint contract_services_range    check (to_period is null or to_period >= from_period)
);
create index contract_services_contract_idx on public.contract_services (contract_id);

-- E11: chỉ số công tơ
create table public.meter_readings (
  id                uuid        primary key default gen_random_uuid(),
  room_id           uuid        not null references public.rooms (id) on delete restrict,
  meter_type        varchar(20) not null,
  period            char(7)     not null,
  previous_reading  integer     not null,
  current_reading   integer     not null,
  -- CK-09: luôn bằng current_reading - previous_reading (cột sinh tự động)
  consumption       integer     generated always as (current_reading - previous_reading) stored,
  is_locked         boolean     not null default false,
  recorded_by       uuid        not null references public.users (id),
  recorded_at       timestamptz not null default now(),
  constraint meter_readings_type     check (meter_type in ('ELECTRICITY', 'WATER')),
  constraint meter_readings_period   check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint meter_readings_previous check (previous_reading >= 0),
  constraint meter_readings_current  check (current_reading >= previous_reading)
);
-- UK-06
create unique index meter_readings_room_type_period_uk on public.meter_readings (room_id, meter_type, period);
create index meter_readings_period_idx on public.meter_readings (period);

-- E12: kỳ hóa đơn, khoản phát sinh
create table public.billing_periods (
  id            uuid        primary key default gen_random_uuid(),
  period        char(7)     not null,
  billing_date  date        not null,
  due_date      date        not null,
  created_by    uuid        not null references public.users (id),
  created_at    timestamptz not null default now(),
  -- CK-10
  constraint billing_periods_period_fmt check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint billing_periods_due        check (due_date >= billing_date)
);
-- UK-07 -> PERIOD_ALREADY_EXISTS
create unique index billing_periods_period_uk on public.billing_periods (period);

create table public.extra_charges (
  id           uuid         primary key default gen_random_uuid(),
  period_id    uuid         not null references public.billing_periods (id) on delete restrict,
  room_id      uuid         not null references public.rooms (id) on delete restrict,
  contract_id  uuid         not null references public.contracts (id) on delete restrict,
  description  varchar(100) not null,
  amount       bigint       not null,
  note         text,
  created_by   uuid         not null references public.users (id),
  created_at   timestamptz  not null default now(),
  -- CK-11
  constraint extra_charges_amount      check (amount > 0),
  constraint extra_charges_description check (char_length(btrim(description)) between 1 and 100)
);
create index extra_charges_period_room_idx on public.extra_charges (period_id, room_id);

-- E13, E14, E15: hóa đơn, dòng hóa đơn, phiếu điều chỉnh
-- MONTHLY: hóa đơn tháng, gắn kỳ. SETTLEMENT: hóa đơn thanh lý, không gắn kỳ.
-- adjustment_total, amount_due, paid_amount, balance, status do trigger tự tính.
create table public.invoices (
  id                   uuid         primary key default gen_random_uuid(),
  code                 varchar(30)  not null,
  invoice_type         varchar(20)  not null default 'MONTHLY',
  period_id            uuid         references public.billing_periods (id) on delete restrict,
  room_id              uuid         not null references public.rooms (id) on delete restrict,
  contract_id          uuid         not null references public.contracts (id) on delete restrict,
  primary_tenant_name  varchar(100) not null,
  billing_date         date         not null,
  due_date             date         not null,
  subtotal             bigint       not null,
  rounding_amount      integer      not null default 0,
  total_amount         bigint       not null,
  adjustment_total     bigint       not null default 0,
  amount_due           bigint       not null,
  paid_amount          bigint       not null default 0,
  balance              bigint       not null,
  status               varchar(20)  not null default 'UNPAID',
  issued_by            uuid         not null references public.users (id),
  issued_at            timestamptz  not null default now(),
  constraint invoices_due_date check (due_date >= billing_date),
  constraint invoices_type     check (invoice_type in ('MONTHLY', 'SETTLEMENT')),
  constraint invoices_type_period check ((invoice_type = 'MONTHLY') = (period_id is not null)),
  -- CK-12
  constraint invoices_subtotal     check (subtotal >= 0),
  constraint invoices_rounding     check (rounding_amount between -499 and 500),
  constraint invoices_total        check (total_amount = subtotal + rounding_amount
                                          and total_amount = (round(subtotal::numeric / 1000) * 1000)::bigint),
  constraint invoices_amount_due   check (amount_due = total_amount + adjustment_total and amount_due >= 0),
  constraint invoices_paid_amount  check (paid_amount >= 0 and paid_amount <= amount_due),
  constraint invoices_balance      check (balance = amount_due - paid_amount),
  constraint invoices_status_check check (status in ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
  -- Trạng thái lưu phải khớp số tiền; OVERDUE tính khi đọc
  constraint invoices_status_match check (status = case when balance = 0 then 'PAID'
                                                        when paid_amount > 0 then 'PARTIALLY_PAID'
                                                        else 'UNPAID' end)
);
-- UK-09
create unique index invoices_code_uk on public.invoices (code);
-- UK-08 -> phòng đã có hóa đơn tháng trong kỳ (ALREADY_ISSUED ở BIL-05)
create unique index invoices_room_period_uk on public.invoices (room_id, period_id) where invoice_type = 'MONTHLY';
-- UK-15 -> mỗi hợp đồng tối đa một hóa đơn thanh lý
create unique index invoices_settlement_uk on public.invoices (contract_id) where invoice_type = 'SETTLEMENT';
create index invoices_contract_idx on public.invoices (contract_id);
create index invoices_period_idx on public.invoices (period_id);
create index invoices_unpaid_idx on public.invoices (due_date) where balance > 0;

create table public.invoice_lines (
  id                  uuid         primary key default gen_random_uuid(),
  invoice_id          uuid         not null references public.invoices (id) on delete restrict,
  charge_type_id      uuid         references public.charge_types (id) on delete restrict,
  description         varchar(150) not null,
  calculation_method  varchar(20)  not null,
  quantity            integer      not null,
  unit                varchar(20)  not null,
  unit_price          bigint       not null,
  amount              bigint       not null,
  previous_reading    integer,
  current_reading     integer,
  days_charged        smallint,
  days_in_period      smallint,
  sort_order          smallint     not null default 0,
  constraint invoice_lines_method   check (calculation_method in ('CONTRACT_RENT', 'METER', 'PER_PERSON', 'PER_ROOM', 'PER_VEHICLE', 'MANUAL')),
  constraint invoice_lines_manual   check ((calculation_method = 'MANUAL') = (charge_type_id is null)),
  -- CK-13
  constraint invoice_lines_values   check (quantity >= 0 and unit_price >= 0 and amount >= 0),
  constraint invoice_lines_days     check ((days_charged is null) = (days_in_period is null)
                                           and (days_in_period is null or days_in_period between 28 and 31)
                                           and (days_charged is null or days_charged between 1 and days_in_period)),
  constraint invoice_lines_days_method check (days_charged is null
                                              or calculation_method in ('CONTRACT_RENT', 'PER_PERSON', 'PER_ROOM', 'PER_VEHICLE')),
  constraint invoice_lines_amount   check (case when days_charged is null
                                                then amount = quantity::bigint * unit_price
                                                else amount = round(quantity::numeric * unit_price * days_charged / days_in_period)::bigint
                                           end),
  constraint invoice_lines_meter    check (case when calculation_method = 'METER'
                                                then previous_reading is not null and current_reading is not null
                                                     and quantity = current_reading - previous_reading
                                                else previous_reading is null and current_reading is null
                                           end)
);
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id, sort_order);

create table public.invoice_adjustments (
  id             uuid        primary key default gen_random_uuid(),
  invoice_id     uuid        not null references public.invoices (id) on delete restrict,
  amount         bigint      not null,
  reason         text        not null,
  status         varchar(20) not null default 'PENDING',
  requested_by   uuid        not null references public.users (id),
  requested_at   timestamptz not null default now(),
  decided_by     uuid        references public.users (id),
  decided_at     timestamptz,
  decision_note  text,
  -- CK-14
  constraint invoice_adjustments_amount  check (amount <> 0 and abs(amount) <= 1000000000),
  constraint invoice_adjustments_reason  check (char_length(btrim(reason)) between 5 and 500),
  constraint invoice_adjustments_status  check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  constraint invoice_adjustments_decided check ((status = 'PENDING') = (decided_by is null and decided_at is null)),
  constraint invoice_adjustments_no_self check (status <> 'APPROVED' or decided_by <> requested_by),
  constraint invoice_adjustments_note    check (status <> 'REJECTED' or char_length(btrim(coalesce(decision_note, ''))) > 0)
);
create index invoice_adjustments_invoice_idx on public.invoice_adjustments (invoice_id);
create index invoice_adjustments_pending_idx on public.invoice_adjustments (requested_at) where status = 'PENDING';

-- E16: thanh toán, yêu cầu hủy thanh toán
create table public.payments (
  id                 uuid         primary key default gen_random_uuid(),
  receipt_number     varchar(30)  not null,
  invoice_id         uuid         not null references public.invoices (id) on delete restrict,
  amount             bigint       not null,
  method             varchar(20)  not null,
  reference_code     varchar(50),
  payer_occupant_id  uuid         references public.occupants (id) on delete restrict,
  payer_name         varchar(100) not null,
  paid_on            date         not null,
  note               text,
  status             varchar(25)  not null default 'VALID',
  recorded_by        uuid         not null references public.users (id),
  recorded_at        timestamptz  not null default now(),
  cancelled_at       timestamptz,
  cancel_reason      text,
  -- CK-15
  constraint payments_amount      check (amount > 0),
  constraint payments_payer_name  check (char_length(btrim(payer_name)) between 1 and 100),
  -- DEPOSIT: cấn trừ tiền cọc khi thanh lý hợp đồng
  constraint payments_method      check (method in ('CASH', 'BANK_TRANSFER', 'DEPOSIT')),
  constraint payments_status      check (status in ('VALID', 'PENDING_CANCELLATION', 'CANCELLED')),
  constraint payments_cancelled   check ((status = 'CANCELLED') = (cancelled_at is not null)
                                         and (status <> 'CANCELLED' or cancel_reason is not null)),
  -- IR-09
  constraint payments_paid_on     check (paid_on <= public.vn_today())
);
-- UK-10
create unique index payments_receipt_number_uk on public.payments (receipt_number);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_paid_on_idx on public.payments (paid_on);

create table public.payment_cancellation_requests (
  id             uuid        primary key default gen_random_uuid(),
  payment_id     uuid        not null references public.payments (id) on delete restrict,
  reason         text        not null,
  status         varchar(20) not null default 'PENDING',
  requested_by   uuid        not null references public.users (id),
  requested_at   timestamptz not null default now(),
  decided_by     uuid        references public.users (id),
  decided_at     timestamptz,
  decision_note  text,
  -- CK-16
  constraint pcr_reason  check (char_length(btrim(reason)) between 5 and 500),
  constraint pcr_status  check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  constraint pcr_decided check ((status = 'PENDING') = (decided_by is null and decided_at is null)),
  constraint pcr_no_self check (status <> 'APPROVED' or decided_by <> requested_by),
  constraint pcr_note    check (status <> 'REJECTED' or char_length(btrim(coalesce(decision_note, ''))) > 0)
);
-- UK-12 -> CANCELLATION_ALREADY_PENDING
create unique index payment_cancellation_requests_pending_uk on public.payment_cancellation_requests (payment_id) where status = 'PENDING';

-- E17: yêu cầu của người thuê
create table public.tenant_requests (
  id                      uuid         primary key default gen_random_uuid(),
  type                    varchar(25)  not null,
  room_id                 uuid         not null references public.rooms (id) on delete restrict,
  contract_id             uuid         not null references public.contracts (id) on delete restrict,
  title                   varchar(100) not null,
  description             text,
  occupant_change_action  varchar(20),
  target_occupant_id      uuid         references public.occupants (id),
  proposed_data           jsonb,
  move_out_date           date,
  status                  varchar(20)  not null,
  submitted_by            uuid         not null references public.users (id),
  submitted_at            timestamptz  not null default now(),
  handled_by              uuid         references public.users (id),
  handled_at              timestamptz,
  response_note           text,
  constraint tenant_requests_type        check (type in ('OCCUPANT_CHANGE', 'MAINTENANCE')),
  constraint tenant_requests_title       check (char_length(btrim(title)) between 5 and 100),
  constraint tenant_requests_description check (description is null or char_length(description) <= 1000),
  constraint tenant_requests_status      check (
    (type = 'OCCUPANT_CHANGE' and status in ('PENDING', 'APPROVED', 'REJECTED'))
    or (type = 'MAINTENANCE' and status in ('NEW', 'IN_PROGRESS', 'DONE', 'REJECTED'))
  ),
  constraint tenant_requests_action      check (
    (type = 'MAINTENANCE' and occupant_change_action is null and target_occupant_id is null
       and proposed_data is null and move_out_date is null)
    or (type = 'OCCUPANT_CHANGE' and occupant_change_action in ('ADD', 'MOVE_OUT', 'UPDATE'))
  ),
  constraint tenant_requests_action_data check (
    occupant_change_action is null
    or (occupant_change_action = 'ADD' and proposed_data is not null and target_occupant_id is null)
    or (occupant_change_action = 'UPDATE' and proposed_data is not null and target_occupant_id is not null)
    or (occupant_change_action = 'MOVE_OUT' and move_out_date is not null and target_occupant_id is not null)
  ),
  constraint tenant_requests_handled     check (
    status not in ('APPROVED', 'REJECTED', 'DONE') or (handled_by is not null and handled_at is not null)
  ),
  constraint tenant_requests_reject_note check (
    status <> 'REJECTED' or char_length(btrim(coalesce(response_note, ''))) > 0
  )
);
create index tenant_requests_contract_idx on public.tenant_requests (contract_id);
create index tenant_requests_status_idx on public.tenant_requests (type, status);

-- E18: loại chi, khoản chi
create table public.expense_categories (
  id          uuid        primary key default gen_random_uuid(),
  name        varchar(50) not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  constraint expense_categories_name_len check (char_length(btrim(name)) between 1 and 50)
);
-- -> CATEGORY_NAME_TAKEN
create unique index expense_categories_name_uk on public.expense_categories (lower(name));

create table public.expenses (
  id           uuid        primary key default gen_random_uuid(),
  category_id  uuid        not null references public.expense_categories (id) on delete restrict,
  spent_on     date        not null,
  amount       bigint      not null,
  description  text,
  recorded_by  uuid        not null references public.users (id),
  recorded_at  timestamptz not null default now(),
  -- CK-17
  constraint expenses_amount   check (amount > 0),
  -- IR-09
  constraint expenses_spent_on check (spent_on <= public.vn_today())
);
create index expenses_spent_on_idx on public.expenses (spent_on);

-- E19: thông báo
create table public.notifications (
  id            uuid         primary key default gen_random_uuid(),
  user_id       uuid         not null references public.users (id) on delete cascade,
  type          varchar(30)  not null,
  title         varchar(150) not null,
  message       text         not null,
  related_type  varchar(20),
  related_id    uuid,
  is_read       boolean      not null default false,
  read_at       timestamptz,
  created_at    timestamptz  not null default now(),
  constraint notifications_type    check (type in ('INVOICE_ISSUED', 'INVOICE_DUE_SOON', 'INVOICE_OVERDUE', 'REQUEST_PROCESSED')),
  constraint notifications_related check ((related_type is null) = (related_id is null)
                                          and (related_type is null or related_type in ('INVOICE', 'REQUEST'))),
  constraint notifications_read    check (not is_read or read_at is not null)
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);
-- UK-16: mỗi (hóa đơn, loại thông báo) chỉ một thông báo, kể cả khi tác vụ định kỳ chạy lại
create unique index notifications_invoice_type_uk on public.notifications (related_id, type) where related_type = 'INVOICE';

-- E20: nhật ký
create table public.audit_logs (
  id               uuid         primary key default gen_random_uuid(),
  occurred_at      timestamptz  not null default now(),
  actor_id         uuid         references public.users (id) on delete restrict,
  actor_username   varchar(50)  not null,
  actor_full_name  varchar(100) not null,
  action           varchar(50)  not null,
  entity_type      varchar(30)  not null,
  entity_id        uuid,
  summary          varchar(255) not null,
  before_data      jsonb,
  after_data       jsonb,
  request_id       varchar(64)
);
create index audit_logs_occurred_idx on public.audit_logs (occurred_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, occurred_at desc);
create index audit_logs_action_idx on public.audit_logs (action, occurred_at desc);

-- Bảng kỹ thuật
create table public.idempotency_keys (
  key              uuid         not null,
  user_id          uuid         not null references public.users (id) on delete cascade,
  endpoint         varchar(100) not null,
  request_hash     char(64)     not null,
  response_status  smallint     not null,
  response_body    jsonb        not null,
  created_at       timestamptz  not null default now(),
  expires_at       timestamptz  not null default (now() + interval '24 hours'),
  primary key (key, user_id),
  constraint idempotency_keys_hash check (request_hash ~ '^[0-9a-f]{64}$')
);
create index idempotency_keys_expires_idx on public.idempotency_keys (expires_at);

create table public.login_attempts (
  username_normalized  varchar(50) primary key,
  failed_count         smallint    not null default 0,
  first_failed_at      timestamptz not null default now(),
  locked_until         timestamptz,
  constraint login_attempts_normalized check (username_normalized = lower(btrim(username_normalized))),
  constraint login_attempts_count      check (failed_count >= 0)
);
