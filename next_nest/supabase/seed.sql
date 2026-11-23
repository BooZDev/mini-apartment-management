-- Dữ liệu mẫu chỉ cho môi trường phát triển (supabase db reset). Mật khẩu mọi tài khoản: Abc@12345

insert into public.users (id, username, password_hash, full_name, phone, must_change_password)
values
  ('00000000-0000-4000-8000-000000000001', 'quantri01',   '$2a$10$Ygt8Y7ydhzmtkauYOQTof.jJ/GOWBIISkN40WzQzeQV3KoSbamARe', 'Quản trị hệ thống', null, false),
  ('00000000-0000-4000-8000-000000000002', 'chunha01',    '$2a$10$Ygt8Y7ydhzmtkauYOQTof.jJ/GOWBIISkN40WzQzeQV3KoSbamARe', 'Chủ nhà',           null, false),
  ('00000000-0000-4000-8000-000000000003', 'quanly01',    '$2a$10$Ygt8Y7ydhzmtkauYOQTof.jJ/GOWBIISkN40WzQzeQV3KoSbamARe', 'Quản lý',           null, false),
  ('00000000-0000-4000-8000-000000000004', 'ketoan01',    '$2a$10$Ygt8Y7ydhzmtkauYOQTof.jJ/GOWBIISkN40WzQzeQV3KoSbamARe', 'Kế toán',           null, false),
  ('00000000-0000-4000-8000-000000000005', 'chuquanly01', '$2a$10$Ygt8Y7ydhzmtkauYOQTof.jJ/GOWBIISkN40WzQzeQV3KoSbamARe', 'Chủ nhà kiêm quản lý', null, false)
on conflict do nothing;

insert into public.user_roles (user_id, role, assigned_by)
values
  ('00000000-0000-4000-8000-000000000001', 'SYSTEM_ADMIN', null),
  ('00000000-0000-4000-8000-000000000002', 'OWNER',        '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000003', 'MANAGER',      '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000004', 'ACCOUNTANT',   '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'OWNER',        '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000005', 'MANAGER',      '00000000-0000-4000-8000-000000000001')
on conflict do nothing;
