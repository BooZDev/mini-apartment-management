import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { selectOne } from 'src/common/database/query.util';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime } from 'src/common/utils/date.util';
import { BuildingSetting } from 'src/entities/building-setting.entity';
import { UpdateBillingSettingsDto } from './dto/update-billing-settings.dto';

type SettingsRow = {
  default_billing_day: number;
  default_payment_term_days: number;
  updated_by: string | null;
  updated_by_name: string | null;
  updated_at: Date | null;
};

@Injectable()
export class BillingSettingsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // SET-01 Xem thiết lập lịch thu mặc định
  async find() {
    const row = await selectOne<SettingsRow>(
      this.dataSource.manager,
      `select s.default_billing_day, s.default_payment_term_days, s.updated_by,
              u.full_name as updated_by_name, s.updated_at
         from public.building_settings s
         left join public.users u on u.id = s.updated_by
        where s.id = 1`,
    );
    if (!row) throw new AppException('INTERNAL_ERROR');
    return {
      defaultBillingDay: row.default_billing_day,
      defaultPaymentTermDays: row.default_payment_term_days,
      updatedBy: row.updated_by ? { id: row.updated_by, fullName: row.updated_by_name } : null,
      updatedAt: row.updated_by ? toVnDateTime(row.updated_at) : null,
    };
  }

  // SET-02 Cập nhật: chỉ là gợi ý cho kỳ mới, kỳ đã tạo không đổi
  async update(dto: UpdateBillingSettingsDto, userId: string) {
    await this.dataSource.getRepository(BuildingSetting).update(
      { id: 1 },
      {
        defaultBillingDay: dto.defaultBillingDay,
        defaultPaymentTermDays: dto.defaultPaymentTermDays,
        updatedBy: userId,
      },
    );
    return this.find();
  }
}
