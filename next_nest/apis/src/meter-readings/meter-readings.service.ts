import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { BillingCalculatorService } from 'src/billing/billing-calculator.service';
import { BillableContract, METER_LABELS } from 'src/billing/billing.types';
import { DetailCode } from 'src/common/constants/error-codes';
import { selectOne, selectRows } from 'src/common/database/query.util';
import { AppException, ErrorDetail } from 'src/common/exceptions/app.exception';
import { periodOf, previousPeriod, toVnDateTime } from 'src/common/utils/date.util';
import { MeterType } from 'src/contracts/enums/contract.enum';
import { FindMeterReadingsDto, SaveMeterReadingsDto } from './dto/meter-reading.dto';

type ReadingRow = {
  room_id: string;
  meter_type: MeterType;
  period: string;
  previous_reading: number;
  current_reading: number;
  is_locked: boolean;
  recorded_by: string;
  recorded_by_name: string;
  recorded_at: Date;
};

type Row = {
  roomId: string;
  roomCode: string;
  meterType: MeterType;
  period: string;
  previousReading: number | null;
  currentReading: number | null;
  consumption: number | null;
  isLocked: boolean;
  recordedBy: { id: string; fullName: string } | null;
  recordedAt: string | null;
};

@Injectable()
export class MeterReadingsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly calculator: BillingCalculatorService,
  ) {}

  // MTR-01 Bảng chỉ số của một kỳ: mỗi phòng được lập hóa đơn × mỗi loại công tơ đang dùng
  async findAll(query: FindMeterReadingsDto) {
    const rows = await this.buildRows(this.dataSource.manager, query.period);
    return rows.filter(
      (r) => (!query.meterType || r.meterType === query.meterType) && (!query.missingOnly || r.currentReading === null),
    );
  }

  // MTR-02 Ghi chỉ số nhiều phòng: lưu tất cả hoặc không lưu dòng nào
  async save(dto: SaveMeterReadingsDto, userId: string) {
    return this.dataSource.transaction(async (manager) => {
      const period = await selectOne<{ id: string }>(manager, `select id from public.billing_periods where period = $1`, [
        dto.period,
      ]);
      if (!period) throw new AppException('PERIOD_NOT_FOUND');

      const rows = await this.buildRows(manager, dto.period);
      const activeTypes = new Set(rows.map((r) => r.meterType));
      const billableRooms = new Set(rows.map((r) => r.roomId));
      const details: ErrorDetail[] = [];

      for (const [i, item] of dto.items.entries()) {
        if (!billableRooms.has(item.roomId)) throw new AppException('ROOM_NOT_OCCUPIED');
        if (!activeTypes.has(item.meterType)) {
          details.push({
            field: `items[${i}].meterType`,
            code: DetailCode.INVALID_FORMAT,
            message: `Chưa có khoản thu ${METER_LABELS[item.meterType]} đang dùng`,
          });
          continue;
        }
        const row = rows.find((r) => r.roomId === item.roomId && r.meterType === item.meterType) as Row;
        if (row.isLocked) throw new AppException('METER_READING_LOCKED');
        if (row.previousReading === null) {
          details.push({
            field: `items[${i}].currentReading`,
            code: DetailCode.PREVIOUS_READING_MISSING,
            message: `Phòng ${row.roomCode} chưa ghi chỉ số ${METER_LABELS[item.meterType]} kỳ trước`,
          });
        } else if (item.currentReading < row.previousReading) {
          details.push({
            field: `items[${i}].currentReading`,
            code: DetailCode.READING_DECREASED,
            message: `Chỉ số mới nhỏ hơn chỉ số cũ (${row.previousReading})`,
          });
        }
      }
      if (details.length > 0) throw new AppException('VALIDATION_ERROR', details);

      for (const item of dto.items) {
        const row = rows.find((r) => r.roomId === item.roomId && r.meterType === item.meterType) as Row;
        // Ghi lại dòng đã có là cập nhật; dòng đã khóa bị trigger chặn (METER_READING_LOCKED)
        await manager.query(
          `insert into public.meter_readings
             (room_id, meter_type, period, previous_reading, current_reading, recorded_by)
           values ($1, $2, $3, $4, $5, $6)
           on conflict (room_id, meter_type, period) do update set
             previous_reading = excluded.previous_reading, current_reading = excluded.current_reading,
             recorded_by = excluded.recorded_by, recorded_at = now()`,
          [item.roomId, item.meterType, dto.period, row.previousReading, item.currentReading, userId],
        );
      }

      const saved = await this.buildRows(manager, dto.period);
      return saved.filter((r) => dto.items.some((i) => i.roomId === r.roomId && i.meterType === r.meterType));
    });
  }

  /**
   * Chỉ số cũ (IR-06): kỳ đầu của hợp đồng lấy chỉ số bàn giao; các kỳ sau lấy chỉ số mới
   * của kỳ trước của phòng, `null` nếu kỳ trước chưa ghi.
   */
  private async buildRows(manager: EntityManager, period: string): Promise<Row[]> {
    const contracts = await this.calculator.billableContracts(manager, period);
    if (contracts.length === 0) return [];

    const types = await selectRows<{ meter_type: MeterType }>(
      manager,
      `select distinct meter_type from public.charge_types
        where calculation_method = 'METER' and is_active order by meter_type`,
    );
    const roomIds = contracts.map((c) => c.room_id);
    const [current, previous, issued] = await Promise.all([
      selectRows<ReadingRow>(
        manager,
        `select m.*, u.full_name as recorded_by_name from public.meter_readings m
           join public.users u on u.id = m.recorded_by
          where m.period = $1 and m.room_id = any($2::uuid[])`,
        [period, roomIds],
      ),
      selectRows<ReadingRow>(
        manager,
        `select room_id, meter_type, current_reading from public.meter_readings
          where period = $1 and room_id = any($2::uuid[])`,
        [previousPeriod(period), roomIds],
      ),
      selectRows<{ room_id: string }>(
        manager,
        `select i.room_id from public.invoices i join public.billing_periods bp on bp.id = i.period_id
          where bp.period = $1 and i.invoice_type = 'MONTHLY'`,
        [period],
      ),
    ]);
    const issuedRooms = new Set(issued.map((r) => r.room_id));

    return contracts.flatMap((contract) =>
      types.map(({ meter_type: type }) => {
        const saved = current.find((r) => r.room_id === contract.room_id && r.meter_type === type);
        const computed =
          periodOf(contract.start_date) === period
            ? initialReading(contract, type)
            : (previous.find((r) => r.room_id === contract.room_id && r.meter_type === type)?.current_reading ?? null);
        // Dòng đã khóa giữ chỉ số cũ đã lập hóa đơn
        const previousReading = saved?.is_locked ? saved.previous_reading : computed;
        return {
          roomId: contract.room_id,
          roomCode: contract.room_code,
          meterType: type,
          period,
          previousReading,
          currentReading: saved?.current_reading ?? null,
          consumption: saved && previousReading !== null ? saved.current_reading - previousReading : null,
          isLocked: (saved?.is_locked ?? false) || issuedRooms.has(contract.room_id),
          recordedBy: saved ? { id: saved.recorded_by, fullName: saved.recorded_by_name } : null,
          recordedAt: toVnDateTime(saved?.recorded_at),
        };
      }),
    );
  }
}

function initialReading(contract: BillableContract, type: MeterType) {
  return type === MeterType.ELECTRICITY ? contract.initial_electricity_reading : contract.initial_water_reading;
}
