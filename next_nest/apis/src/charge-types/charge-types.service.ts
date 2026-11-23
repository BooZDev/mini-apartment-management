import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { DetailCode } from 'src/common/constants/error-codes';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { definedOnly, lockRow, selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime, vnToday } from 'src/common/utils/date.util';
import { MeterType } from 'src/contracts/enums/contract.enum';
import { ChargePrice } from 'src/entities/charge-price.entity';
import { ChargeType } from 'src/entities/charge-type.entity';
import { CreateChargeTypeDto } from './dto/create-charge-type.dto';
import { CreatePriceDto } from './dto/create-price.dto';
import { FindChargeTypesDto } from './dto/find-charge-types.dto';
import { UpdateChargeTypeDto } from './dto/update-charge-type.dto';
import { CalculationMethod } from './enums/calculation-method.enum';

type ChargeTypeRow = {
  id: string;
  name: string;
  calculation_method: CalculationMethod;
  meter_type: MeterType | null;
  unit: string;
  is_mandatory: boolean;
  is_active: boolean;
  price_id: string | null;
  price_unit_price: number | null;
  price_effective_from: string | null;
  price_is_used: boolean | null;
  price_created_by: string | null;
  price_created_by_name: string | null;
  price_created_at: Date | null;
};

type PriceRow = {
  id: string;
  charge_type_id: string;
  unit_price: number;
  effective_from: string;
  is_used: boolean;
  created_by: string;
  created_by_name: string;
  created_at: Date;
};

// Đơn giá hiện hành: effective_from muộn nhất mà không sau hôm nay ($1)
const CHARGE_TYPE_SELECT = `
  select ct.id, ct.name, ct.calculation_method, ct.meter_type, ct.unit, ct.is_mandatory, ct.is_active,
         p.id as price_id, p.unit_price as price_unit_price, p.effective_from as price_effective_from,
         p.is_used as price_is_used, p.created_by as price_created_by,
         u.full_name as price_created_by_name, p.created_at as price_created_at
    from public.charge_types ct
    left join lateral (
      select * from public.charge_prices cp
       where cp.charge_type_id = ct.id and cp.effective_from <= $1::date
       order by cp.effective_from desc
       limit 1
    ) p on ct.calculation_method <> 'CONTRACT_RENT'
    left join public.users u on u.id = p.created_by`;

const DEFAULT_UNITS: Record<string, string> = {
  PER_PERSON: 'người',
  PER_ROOM: 'phòng',
  PER_VEHICLE: 'xe',
};

@Injectable()
export class ChargeTypesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // CHG-01 Danh sách khoản thu kèm đơn giá hiện hành
  async findAll(query: FindChargeTypesDto) {
    const where = new WhereBuilder();
    where.param(vnToday());
    if (query.isActive !== undefined) where.add('ct.is_active = ?', query.isActive);
    const rows = await selectRows<ChargeTypeRow>(
      this.dataSource.manager,
      `${CHARGE_TYPE_SELECT} ${where.sql} order by lower(ct.name), ct.id`,
      where.params,
    );
    return rows.map(toChargeTypeResponse);
  }

  async findOne(id: string, manager: EntityManager = this.dataSource.manager) {
    const row = await selectOne<ChargeTypeRow>(manager, `${CHARGE_TYPE_SELECT} where ct.id = $2`, [vnToday(), id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return toChargeTypeResponse(row);
  }

  // CHG-02 Thêm khoản thu
  async create(dto: CreateChargeTypeDto, ctx: RequestContext) {
    const isMeter = dto.calculationMethod === CalculationMethod.METER;
    if (!isMeter && dto.meterType !== undefined) {
      throw AppException.field('meterType', DetailCode.INVALID_FORMAT, 'Chỉ khoản thu theo chỉ số mới có loại công tơ');
    }
    const meterType = isMeter ? (dto.meterType as MeterType) : null;
    const unit =
      dto.unit ?? (isMeter ? (meterType === MeterType.ELECTRICITY ? 'kWh' : 'm³') : DEFAULT_UNITS[dto.calculationMethod]);
    const isMandatory =
      dto.isMandatory ??
      (dto.calculationMethod === CalculationMethod.METER || dto.calculationMethod === CalculationMethod.PER_PERSON);

    return this.dataSource.transaction(async (manager) => {
      const { identifiers } = await manager.getRepository(ChargeType).insert({
        name: dto.name,
        calculationMethod: dto.calculationMethod as CalculationMethod,
        meterType,
        unit,
        isMandatory,
        isActive: true,
      });
      const id = identifiers[0].id as string;

      const price = await this.insertPrice(manager, id, dto.initialPrice, ctx.user.id);

      await this.auditLogsService.log(manager, ctx, {
        action: 'CHARGE_TYPE_CREATED',
        entityType: 'CHARGE_TYPE',
        entityId: id,
        summary: `Thêm khoản thu ${dto.name}`,
        after: { name: dto.name, calculationMethod: dto.calculationMethod, meterType, unit, isMandatory },
      });
      await this.auditLogsService.log(manager, ctx, {
        action: 'PRICE_CREATED',
        entityType: 'CHARGE_PRICE',
        entityId: price.id,
        summary: `Đơn giá ${dto.name}: ${dto.initialPrice.unitPrice} đ từ ${dto.initialPrice.effectiveFrom}`,
        after: { unitPrice: dto.initialPrice.unitPrice, effectiveFrom: dto.initialPrice.effectiveFrom },
      });

      return this.findOne(id, manager);
    });
  }

  // CHG-03 Sửa, ngừng dùng khoản thu
  async update(id: string, dto: UpdateChargeTypeDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      if (!(await lockRow(manager, 'charge_types', id))) throw new AppException('RESOURCE_NOT_FOUND');
      const before = await manager.getRepository(ChargeType).findOneByOrFail({ id });
      const isSystem = before.calculationMethod === CalculationMethod.CONTRACT_RENT;

      const method = dto.calculationMethod ?? before.calculationMethod;
      const meterType = dto.meterType !== undefined ? dto.meterType : before.meterType;
      const methodChanged = method !== before.calculationMethod || meterType !== before.meterType;

      if (isSystem && (methodChanged || dto.isActive === false || dto.isMandatory === false)) {
        throw new AppException('SYSTEM_CHARGE_TYPE');
      }
      if (methodChanged) {
        if (method === CalculationMethod.CONTRACT_RENT || method === CalculationMethod.MANUAL) {
          throw AppException.field('calculationMethod', DetailCode.INVALID_FORMAT, 'Không chọn được cách tính này');
        }
        if ((method === CalculationMethod.METER) !== (meterType !== null)) {
          throw AppException.field(
            'meterType',
            method === CalculationMethod.METER ? DetailCode.REQUIRED : DetailCode.INVALID_FORMAT,
            'Loại công tơ chỉ có và bắt buộc có khi cách tính là METER',
          );
        }
        const used = await selectOne(manager, `select 1 from public.invoice_lines where charge_type_id = $1 limit 1`, [id]);
        if (used) throw new AppException('CHARGE_TYPE_IN_USE');
      }

      const changes = definedOnly({
        name: dto.name,
        unit: dto.unit,
        isMandatory: dto.isMandatory,
        isActive: dto.isActive,
        calculationMethod: methodChanged ? method : undefined,
        meterType: methodChanged ? meterType : undefined,
      });
      if (Object.keys(changes).length > 0) {
        await manager.getRepository(ChargeType).update({ id }, changes);
        await this.auditLogsService.log(manager, ctx, {
          action: 'CHARGE_TYPE_UPDATED',
          entityType: 'CHARGE_TYPE',
          entityId: id,
          summary: `Sửa khoản thu ${before.name}`,
          before: pick(before, Object.keys(changes)),
          after: changes,
        });
      }
      return this.findOne(id, manager);
    });
  }

  // CHG-04 Lịch sử đơn giá
  async findPrices(chargeTypeId: string) {
    await this.findOne(chargeTypeId);
    const rows = await selectRows<PriceRow>(
      this.dataSource.manager,
      `select p.*, u.full_name as created_by_name
         from public.charge_prices p
         join public.users u on u.id = p.created_by
        where p.charge_type_id = $1
        order by p.effective_from desc`,
      [chargeTypeId],
    );
    return rows.map(toPriceResponse);
  }

  // CHG-05 Thêm đơn giá có ngày hiệu lực
  async createPrice(chargeTypeId: string, dto: CreatePriceDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      if (!(await lockRow(manager, 'charge_types', chargeTypeId))) throw new AppException('RESOURCE_NOT_FOUND');
      const type = await manager.getRepository(ChargeType).findOneByOrFail({ id: chargeTypeId });
      if (type.calculationMethod === CalculationMethod.CONTRACT_RENT) {
        throw new AppException('CHARGE_TYPE_HAS_NO_PRICE');
      }

      const price = await this.insertPrice(manager, chargeTypeId, dto, ctx.user.id);
      await this.auditLogsService.log(manager, ctx, {
        action: 'PRICE_CREATED',
        entityType: 'CHARGE_PRICE',
        entityId: price.id,
        summary: `Đơn giá ${type.name}: ${dto.unitPrice} đ từ ${dto.effectiveFrom}`,
        after: { unitPrice: dto.unitPrice, effectiveFrom: dto.effectiveFrom },
      });
      return this.findPrice(manager, price.id);
    });
  }

  // CHG-06 Xóa đơn giá chưa từng dùng
  async deletePrice(chargeTypeId: string, priceId: string, ctx: RequestContext) {
    await this.dataSource.transaction(async (manager) => {
      // Khóa khoản thu: hai người xóa cùng lúc không làm mất hết đơn giá
      if (!(await lockRow(manager, 'charge_types', chargeTypeId))) throw new AppException('RESOURCE_NOT_FOUND');
      const repo = manager.getRepository(ChargePrice);
      const price = await repo.findOneBy({ id: priceId, chargeTypeId });
      if (!price) throw new AppException('RESOURCE_NOT_FOUND');

      const count = await repo.countBy({ chargeTypeId });
      if (price.isUsed || count <= 1) throw new AppException('PRICE_IN_USE');

      await repo.delete({ id: priceId });
      await this.auditLogsService.log(manager, ctx, {
        action: 'PRICE_DELETED',
        entityType: 'CHARGE_PRICE',
        entityId: priceId,
        summary: `Xóa đơn giá ${price.unitPrice} đ từ ${price.effectiveFrom}`,
        before: { unitPrice: price.unitPrice, effectiveFrom: price.effectiveFrom },
      });
    });
  }

  private async insertPrice(manager: EntityManager, chargeTypeId: string, dto: CreatePriceDto, userId: string) {
    const { identifiers } = await manager.getRepository(ChargePrice).insert({
      chargeTypeId,
      unitPrice: dto.unitPrice,
      effectiveFrom: dto.effectiveFrom,
      createdBy: userId,
    });
    return { id: identifiers[0].id as string };
  }

  private async findPrice(manager: EntityManager, id: string) {
    const row = await selectOne<PriceRow>(
      manager,
      `select p.*, u.full_name as created_by_name
         from public.charge_prices p join public.users u on u.id = p.created_by
        where p.id = $1`,
      [id],
    );
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return toPriceResponse(row);
  }
}

function pick(source: object, keys: string[]) {
  const record = source as Record<string, unknown>;
  return Object.fromEntries(keys.map((k) => [k, record[k]]));
}

function toPriceResponse(r: PriceRow) {
  return {
    id: r.id,
    chargeTypeId: r.charge_type_id,
    unitPrice: r.unit_price,
    effectiveFrom: r.effective_from,
    isUsed: r.is_used,
    createdBy: { id: r.created_by, fullName: r.created_by_name },
    createdAt: toVnDateTime(r.created_at),
  };
}

function toChargeTypeResponse(r: ChargeTypeRow) {
  return {
    id: r.id,
    name: r.name,
    calculationMethod: r.calculation_method,
    meterType: r.meter_type,
    unit: r.unit,
    isMandatory: r.is_mandatory,
    isActive: r.is_active,
    currentPrice: r.price_id
      ? toPriceResponse({
          id: r.price_id,
          charge_type_id: r.id,
          unit_price: r.price_unit_price as number,
          effective_from: r.price_effective_from as string,
          is_used: r.price_is_used as boolean,
          created_by: r.price_created_by as string,
          created_by_name: r.price_created_by_name as string,
          created_at: r.price_created_at as Date,
        })
      : null,
  };
}
