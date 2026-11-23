-- Trigger cho quy tắc toàn vẹn liên bảng. Lỗi nghiệp vụ: SQLSTATE P0001, message là mã lỗi API.

create or replace function public.raise_business_error(p_code text, p_detail text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_code, detail = coalesce(p_detail, p_code);
end $$;

-- updated_at tự cập nhật
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger users_set_updated_at             before update on public.users             for each row execute function public.set_updated_at();
create trigger building_settings_set_updated_at before update on public.building_settings for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at             before update on public.rooms             for each row execute function public.set_updated_at();
create trigger occupants_set_updated_at         before update on public.occupants         for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at         before update on public.contracts         for each row execute function public.set_updated_at();
create trigger charge_types_set_updated_at      before update on public.charge_types      for each row execute function public.set_updated_at();
create trigger contract_services_set_updated_at before update on public.contract_services for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- IR-10: không xóa vật lý tài khoản, hợp đồng, hóa đơn, phiếu điều chỉnh,
-- thanh toán, yêu cầu, nhật ký
-- ---------------------------------------------------------------------
create or replace function public.prevent_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.raise_business_error('DELETE_NOT_ALLOWED', 'Không được xóa bản ghi của bảng ' || tg_table_name);
  return null;
end $$;

create trigger users_no_delete                         before delete on public.users                         for each row execute function public.prevent_delete();
create trigger contracts_no_delete                     before delete on public.contracts                     for each row execute function public.prevent_delete();
create trigger contract_renewals_no_delete             before delete on public.contract_renewals             for each row execute function public.prevent_delete();
create trigger invoices_no_delete                      before delete on public.invoices                      for each row execute function public.prevent_delete();
create trigger invoice_lines_no_delete                 before delete on public.invoice_lines                 for each row execute function public.prevent_delete();
create trigger invoice_adjustments_no_delete           before delete on public.invoice_adjustments           for each row execute function public.prevent_delete();
create trigger payments_no_delete                      before delete on public.payments                      for each row execute function public.prevent_delete();
create trigger payment_cancellation_requests_no_delete before delete on public.payment_cancellation_requests for each row execute function public.prevent_delete();
create trigger tenant_requests_no_delete               before delete on public.tenant_requests               for each row execute function public.prevent_delete();
create trigger audit_logs_no_delete                    before delete on public.audit_logs                    for each row execute function public.prevent_delete();

-- Bản ghi bất biến: nhật ký, dòng hóa đơn đã chụp, lần gia hạn đã ghi
create or replace function public.prevent_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.raise_business_error('IMMUTABLE_RECORD', 'Không được sửa bản ghi của bảng ' || tg_table_name);
  return null;
end $$;

create trigger audit_logs_no_update        before update on public.audit_logs        for each row execute function public.prevent_update();
create trigger invoice_lines_no_update     before update on public.invoice_lines     for each row execute function public.prevent_update();
create trigger contract_renewals_no_update before update on public.contract_renewals for each row execute function public.prevent_update();

-- ---------------------------------------------------------------------
-- Số phải trả, đã trả, còn nợ, trạng thái của hóa đơn do CSDL tự tính từ một nguồn:
-- tổng hóa đơn + phiếu điều chỉnh APPROVED - thanh toán VALID, PENDING_CANCELLATION.
-- Máy chủ chỉ ghi thanh toán, phiếu điều chỉnh; không tự ghi các cột này.
-- ---------------------------------------------------------------------

-- Hóa đơn mới: bắt đầu chưa có điều chỉnh, chưa trả
create or replace function public.invoices_init_amounts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.adjustment_total := 0;
  new.amount_due := new.total_amount;
  new.paid_amount := 0;
  new.balance := new.total_amount;
  new.status := case when new.total_amount = 0 then 'PAID' else 'UNPAID' end;
  return new;
end $$;

create trigger invoices_init_amounts before insert on public.invoices for each row execute function public.invoices_init_amounts();

-- Tính lại một hóa đơn; khóa dòng hóa đơn trước khi cộng nên an toàn khi ghi đồng thời
create or replace function public.recalc_invoice(p_invoice_id uuid, p_source text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_total bigint;
  v_adj   bigint;
  v_paid  bigint;
  v_due   bigint;
begin
  select i.total_amount into v_total from public.invoices i where i.id = p_invoice_id for update;
  select coalesce(sum(a.amount), 0) into v_adj
    from public.invoice_adjustments a where a.invoice_id = p_invoice_id and a.status = 'APPROVED';
  select coalesce(sum(p.amount), 0) into v_paid
    from public.payments p where p.invoice_id = p_invoice_id and p.status in ('VALID', 'PENDING_CANCELLATION');
  v_due := v_total + v_adj;
  if v_due < 0 or v_paid > v_due then
    perform public.raise_business_error(
      case when p_source = 'PAYMENT' then 'AMOUNT_EXCEEDS_BALANCE' else 'ADJUSTMENT_BELOW_PAID' end);
  end if;
  perform set_config('app.invoice_recalc', 'on', true);
  update public.invoices
     set adjustment_total = v_adj,
         amount_due       = v_due,
         paid_amount      = v_paid,
         balance          = v_due - v_paid,
         status           = case when v_due - v_paid = 0 then 'PAID'
                                 when v_paid > 0 then 'PARTIALLY_PAID'
                                 else 'UNPAID' end
   where id = p_invoice_id;
  perform set_config('app.invoice_recalc', 'off', true);
end $$;

-- Hóa đơn đã phát hành không sửa nội dung (BR-19, BR-25); các cột tổng hợp chỉ đổi qua recalc_invoice
create or replace function public.invoices_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.code, new.invoice_type, new.period_id, new.room_id, new.contract_id, new.primary_tenant_name,
      new.billing_date, new.due_date, new.subtotal, new.rounding_amount, new.total_amount,
      new.issued_by, new.issued_at)
     is distinct from
     (old.code, old.invoice_type, old.period_id, old.room_id, old.contract_id, old.primary_tenant_name,
      old.billing_date, old.due_date, old.subtotal, old.rounding_amount, old.total_amount,
      old.issued_by, old.issued_at) then
    perform public.raise_business_error('IMMUTABLE_RECORD', 'Hóa đơn đã phát hành chỉ thay đổi qua điều chỉnh hoặc thanh toán');
  end if;
  if (new.adjustment_total, new.amount_due, new.paid_amount, new.balance, new.status)
     is distinct from (old.adjustment_total, old.amount_due, old.paid_amount, old.balance, old.status)
     and coalesce(current_setting('app.invoice_recalc', true), '') <> 'on' then
    perform public.raise_business_error('IMMUTABLE_RECORD', 'Số đã trả, còn nợ, trạng thái hóa đơn do CSDL tự tính');
  end if;
  return new;
end $$;

create trigger invoices_guard_update before update on public.invoices for each row execute function public.invoices_guard_update();

-- Thanh toán mới: hóa đơn còn nợ, không nộp vượt; cấn trừ cọc không vượt tiền cọc của hợp đồng
create or replace function public.payments_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_balance  bigint;
  v_contract uuid;
  v_deposit  bigint;
  v_refund   bigint;
  v_applied  bigint;
begin
  new.status := 'VALID';
  new.cancelled_at := null;
  new.cancel_reason := null;
  select i.balance, i.contract_id into v_balance, v_contract
    from public.invoices i where i.id = new.invoice_id for update;
  if v_balance = 0 then
    perform public.raise_business_error('INVOICE_ALREADY_PAID');
  end if;
  if new.amount > v_balance then
    perform public.raise_business_error('AMOUNT_EXCEEDS_BALANCE', 'Số còn nợ hiện tại: ' || v_balance);
  end if;
  if new.method = 'DEPOSIT' then
    select c.deposit, coalesce(c.deposit_refund_amount, 0) into v_deposit, v_refund
      from public.contracts c where c.id = v_contract for update;
    select coalesce(sum(p.amount), 0) into v_applied
      from public.payments p join public.invoices i on i.id = p.invoice_id
     where i.contract_id = v_contract and p.method = 'DEPOSIT' and p.status <> 'CANCELLED';
    if v_applied + v_refund + new.amount > v_deposit then
      perform public.raise_business_error('DEPOSIT_EXCEEDED', 'Cấn trừ vượt tiền cọc của hợp đồng');
    end if;
  end if;
  return new;
end $$;

create trigger payments_before_insert before insert on public.payments for each row execute function public.payments_before_insert();

create or replace function public.payments_after_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.recalc_invoice(new.invoice_id, 'PAYMENT');
  return null;
end $$;

create trigger payments_after_change after insert or update of status on public.payments
  for each row execute function public.payments_after_change();

-- Phiếu điều chỉnh: không làm số phải trả nhỏ hơn số đã trả (ADJ-01, ADJ-03); đã xử lý thì không đổi
create or replace function public.invoice_adjustments_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_total bigint;
  v_adj   bigint;
  v_paid  bigint;
begin
  select i.total_amount, i.adjustment_total, i.paid_amount into v_total, v_adj, v_paid
    from public.invoices i where i.id = new.invoice_id for update;
  if v_total + v_adj + new.amount < v_paid or v_total + v_adj + new.amount < 0 then
    perform public.raise_business_error('ADJUSTMENT_BELOW_PAID');
  end if;
  return new;
end $$;

create trigger invoice_adjustments_before_insert before insert on public.invoice_adjustments
  for each row execute function public.invoice_adjustments_before_insert();

create or replace function public.approval_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'PENDING' then
    perform public.raise_business_error('REQUEST_ALREADY_PROCESSED');
  end if;
  return new;
end $$;

create trigger invoice_adjustments_guard_update before update on public.invoice_adjustments
  for each row execute function public.approval_guard_update();
create trigger payment_cancellation_requests_guard_update before update on public.payment_cancellation_requests
  for each row execute function public.approval_guard_update();

create or replace function public.invoice_adjustments_after_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.recalc_invoice(new.invoice_id, 'ADJUSTMENT');
  return null;
end $$;

create trigger invoice_adjustments_after_change after insert or update of status on public.invoice_adjustments
  for each row execute function public.invoice_adjustments_after_change();

-- Yêu cầu hủy: không hủy thanh toán đã hủy, không hủy khoản cấn trừ cọc
create or replace function public.payment_cancellation_requests_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_method text;
  v_status text;
begin
  select p.method, p.status into v_method, v_status from public.payments p where p.id = new.payment_id;
  if v_status = 'CANCELLED' then
    perform public.raise_business_error('PAYMENT_ALREADY_CANCELLED');
  end if;
  if v_method = 'DEPOSIT' then
    perform public.raise_business_error('PAYMENT_NOT_CANCELLABLE');
  end if;
  return new;
end $$;

create trigger payment_cancellation_requests_before_insert before insert on public.payment_cancellation_requests
  for each row execute function public.payment_cancellation_requests_before_insert();

-- Hợp đồng: tiền cọc đã cấn trừ cộng số trả lại không vượt tiền cọc
create or replace function public.contracts_guard_deposit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_applied bigint;
begin
  select coalesce(sum(p.amount), 0) into v_applied
    from public.payments p join public.invoices i on i.id = p.invoice_id
   where i.contract_id = new.id and p.method = 'DEPOSIT' and p.status <> 'CANCELLED';
  if v_applied + coalesce(new.deposit_refund_amount, 0) > new.deposit then
    perform public.raise_business_error('DEPOSIT_EXCEEDED', 'Tiền cọc đã cấn trừ cộng số trả lại vượt tiền cọc');
  end if;
  return new;
end $$;

create trigger contracts_guard_deposit before update of deposit, deposit_refund_amount on public.contracts
  for each row execute function public.contracts_guard_deposit();

-- Thanh toán: không sửa nội dung, chỉ đổi trạng thái hủy (BR-31)
create or replace function public.payments_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.receipt_number, new.invoice_id, new.amount, new.method, new.reference_code,
      new.payer_occupant_id, new.payer_name, new.paid_on, new.recorded_by, new.recorded_at)
     is distinct from
     (old.receipt_number, old.invoice_id, old.amount, old.method, old.reference_code,
      old.payer_occupant_id, old.payer_name, old.paid_on, old.recorded_by, old.recorded_at) then
    perform public.raise_business_error('IMMUTABLE_RECORD', 'Thanh toán không được sửa, chỉ được yêu cầu hủy');
  end if;
  if old.status = 'CANCELLED' then
    perform public.raise_business_error('PAYMENT_ALREADY_CANCELLED');
  end if;
  if new.status <> old.status and old.method = 'DEPOSIT' then
    perform public.raise_business_error('PAYMENT_NOT_CANCELLABLE');
  end if;
  return new;
end $$;

create trigger payments_guard_update before update on public.payments for each row execute function public.payments_guard_update();

-- IR-06: chỉ số đã khóa sau khi phát hành không sửa, không xóa
create or replace function public.meter_readings_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_locked then
    perform public.raise_business_error('METER_READING_LOCKED');
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger meter_readings_guard before update or delete on public.meter_readings for each row execute function public.meter_readings_guard();

-- IR-07: đơn giá đã dùng lập hóa đơn không sửa, không xóa
create or replace function public.charge_prices_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_used then
    if tg_op = 'DELETE' or (new.charge_type_id, new.unit_price, new.effective_from, new.is_used)
                           is distinct from (old.charge_type_id, old.unit_price, old.effective_from, true) then
      perform public.raise_business_error('PRICE_IN_USE');
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger charge_prices_guard before update or delete on public.charge_prices for each row execute function public.charge_prices_guard();

-- Khoản "Tiền phòng" của hệ thống: không đổi cách tính, không ngừng dùng (CHG-03)
create or replace function public.charge_types_guard_system()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.calculation_method = 'CONTRACT_RENT'
     and (new.calculation_method <> old.calculation_method or not new.is_active or not new.is_mandatory) then
    perform public.raise_business_error('SYSTEM_CHARGE_TYPE');
  end if;
  return new;
end $$;

create trigger charge_types_guard_system before update on public.charge_types
  for each row execute function public.charge_types_guard_system();

-- IR-07: hợp đồng đã có hóa đơn không đổi phòng, ngày bắt đầu, giá thuê, chỉ số bàn giao
create or replace function public.contracts_guard_invoiced()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.room_id, new.start_date, new.monthly_rent, new.initial_electricity_reading, new.initial_water_reading)
     is distinct from
     (old.room_id, old.start_date, old.monthly_rent, old.initial_electricity_reading, old.initial_water_reading)
     and exists (select 1 from public.invoices i where i.contract_id = old.id) then
    perform public.raise_business_error('CONTRACT_HAS_INVOICE');
  end if;
  return new;
end $$;

create trigger contracts_guard_invoiced before update on public.contracts for each row execute function public.contracts_guard_invoiced();

-- IR-02: bảo trì và hợp đồng của phòng
create or replace function public.rooms_guard_maintenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_under_maintenance and not old.is_under_maintenance
     and exists (select 1 from public.contracts c where c.room_id = new.id and c.ended_on is null) then
    perform public.raise_business_error('ROOM_HAS_ACTIVE_CONTRACT');
  end if;
  return new;
end $$;

create trigger rooms_guard_maintenance before update of is_under_maintenance on public.rooms
  for each row execute function public.rooms_guard_maintenance();

create or replace function public.contracts_guard_room_maintenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ended_on is null and (tg_op = 'INSERT' or new.room_id is distinct from old.room_id)
     and exists (select 1 from public.rooms r where r.id = new.room_id and r.is_under_maintenance) then
    perform public.raise_business_error('ROOM_UNDER_MAINTENANCE');
  end if;
  return new;
end $$;

create trigger contracts_guard_room_maintenance before insert or update of room_id on public.contracts
  for each row execute function public.contracts_guard_room_maintenance();

-- IR-04: tài khoản người thuê chỉ có vai trò TENANT
create or replace function public.user_roles_guard_tenant()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.user_roles ur
    where ur.user_id = new.user_id
      and ur.role <> new.role
      and (ur.role = 'TENANT' or new.role = 'TENANT')
  ) then
    perform public.raise_business_error('TENANT_ACCOUNT_NOT_EDITABLE', 'Tài khoản người thuê chỉ có vai trò TENANT');
  end if;
  return new;
end $$;

create trigger user_roles_guard_tenant before insert or update on public.user_roles
  for each row execute function public.user_roles_guard_tenant();

-- ---------------------------------------------------------------------
-- IR-11: CCCD không trùng giữa những người có thời gian ở giao nhau.
-- Ngày rời đi không tính là còn ở, nên người chuyển phòng trong cùng một ngày vẫn hợp lệ.
-- ---------------------------------------------------------------------
create or replace function public.id_number_overlaps(
  p_id_number text, p_exclude_stay uuid, p_move_in date, p_move_out date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.contract_occupants co
    join public.occupants o on o.id = co.occupant_id
    where o.id_number = p_id_number
      and co.id is distinct from p_exclude_stay
      and daterange(co.move_in_date, co.move_out_date, '[)') && daterange(p_move_in, p_move_out, '[)')
  )
$$;

create or replace function public.contract_occupants_guard_id_number()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_id_number text;
begin
  select o.id_number into v_id_number from public.occupants o where o.id = new.occupant_id;
  if v_id_number is not null
     and public.id_number_overlaps(v_id_number, new.id, new.move_in_date, new.move_out_date) then
    perform public.raise_business_error('ID_NUMBER_TAKEN');
  end if;
  return new;
end $$;

create trigger contract_occupants_guard_id_number before insert or update of occupant_id, move_in_date, move_out_date
  on public.contract_occupants for each row execute function public.contract_occupants_guard_id_number();

create or replace function public.occupants_guard_id_number()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_stay record;
begin
  if new.id_number is not null and new.id_number is distinct from old.id_number then
    for v_stay in select co.id, co.move_in_date, co.move_out_date from public.contract_occupants co where co.occupant_id = new.id loop
      if exists (
        select 1
        from public.contract_occupants co2
        join public.occupants o2 on o2.id = co2.occupant_id
        where o2.id_number = new.id_number
          and o2.id <> new.id
          and daterange(co2.move_in_date, co2.move_out_date, '[)') && daterange(v_stay.move_in_date, v_stay.move_out_date, '[)')
      ) then
        perform public.raise_business_error('ID_NUMBER_TAKEN');
      end if;
    end loop;
  end if;
  return new;
end $$;

create trigger occupants_guard_id_number before update of id_number on public.occupants
  for each row execute function public.occupants_guard_id_number();
