-- Dữ liệu hệ thống bắt buộc ở mọi môi trường

-- E03: một dòng cấu hình tòa nhà
insert into public.building_settings (id) values (1)
on conflict (id) do nothing;

-- Khoản thu "Tiền phòng" tạo sẵn, lấy giá từ hợp đồng; không tạo thêm, không ngừng dùng được (CHG-03)
insert into public.charge_types (name, calculation_method, unit, is_mandatory, is_active)
values ('Tiền phòng', 'CONTRACT_RENT', 'tháng', true, true)
on conflict do nothing;
