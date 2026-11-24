import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import {
  definedOnly,
  lockRow,
  selectOne,
  selectRows,
  WhereBuilder,
} from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { toVnDateTime, vnToday } from 'src/common/utils/date.util';
import { buildOrderBy } from 'src/common/utils/sort.util';
import { formatMoney, likeContains } from 'src/common/utils/text.util';
import { Room } from 'src/entities/room.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { FindRoomsDto } from './dto/find-rooms.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomStatus } from './enums/room-status.enum';

type RoomRow = {
  id: string;
  code: string;
  floor: number;
  area_m2: number;
  listed_price: number;
  is_under_maintenance: boolean;
  note: string | null;
  created_at: Date;
  updated_at: Date;
  status: RoomStatus;
  active_id: string | null;
  active_primary_name: string | null;
  active_start_date: string | null;
  active_end_date: string | null;
  upcoming_id: string | null;
  upcoming_primary_name: string | null;
  upcoming_start_date: string | null;
  upcoming_end_date: string | null;
  occupant_count: number;
  total?: number;
};

// MAINTENANCE do QL đặt; OCCUPIED khi có hợp đồng chưa kết thúc đã tới ngày bắt đầu ($1 là hôm nay)
const ROOM_SELECT = `
  select r.id, r.code, r.floor, r.area_m2, r.listed_price, r.is_under_maintenance, r.note,
         r.created_at, r.updated_at,
         case when r.is_under_maintenance then 'MAINTENANCE'
              when ac.id is not null then 'OCCUPIED'
              else 'VACANT' end as status,
         ac.id as active_id, ac.full_name as active_primary_name,
         ac.start_date as active_start_date, ac.end_date as active_end_date,
         uc.id as upcoming_id, uc.full_name as upcoming_primary_name,
         uc.start_date as upcoming_start_date, uc.end_date as upcoming_end_date,
         coalesce((select count(*)
                     from public.contract_occupants co
                    where co.contract_id = ac.id
                      and co.move_in_date <= $1::date
                      and (co.move_out_date is null or co.move_out_date > $1::date)), 0) as occupant_count
    from public.rooms r
    left join lateral (
      select c.id, c.start_date, c.end_date, o.full_name
        from public.contracts c
        join public.occupants o on o.id = c.primary_occupant_id
       where c.room_id = r.id and c.ended_on is null and c.start_date <= $1::date
       order by c.start_date desc
       limit 1
    ) ac on true
    left join lateral (
      select c.id, c.start_date, c.end_date, o.full_name
        from public.contracts c
        join public.occupants o on o.id = c.primary_occupant_id
       where c.room_id = r.id and c.ended_on is null and c.start_date > $1::date
       order by c.start_date asc
       limit 1
    ) uc on true`;

const SORT_FIELDS = {
  code: 'r.code',
  floor: 'r.floor',
  areaM2: 'r.area_m2',
  listedPrice: 'r.listed_price',
  createdAt: 'r.created_at',
};

@Injectable()
export class RoomsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ROOM-01 Danh sách phòng
  async findAll(query: FindRoomsDto) {
    const where = new WhereBuilder();
    where.param(vnToday());
    if (query.status) where.add('x.status = ?', query.status);
    if (query.floor !== undefined) where.add('x.floor = ?', query.floor);
    if (query.q) where.add(`lower(x.code) like ? escape '\\'`, likeContains(query.q));

    const orderBy = buildOrderBy(query.sort, SORT_FIELDS, 'code', 'x.id').replaceAll('r.', 'x.');
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);

    const rows = await selectRows<RoomRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total
         from (${ROOM_SELECT}) x
         ${where.sql}
        order by ${orderBy}
        limit ${limit} offset ${offset}`,
      where.params,
    );

    return new Paginated(rows.map(toRoomResponse), query.page, query.pageSize, rows[0]?.total ?? 0);
  }

  // ROOM-03 Chi tiết phòng
  async findOne(id: string, manager: EntityManager = this.dataSource.manager) {
    const row = await selectOne<RoomRow>(manager, `${ROOM_SELECT} where r.id = $2`, [vnToday(), id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return toRoomResponse(row);
  }

  // ROOM-02 Thêm phòng
  async create(dto: CreateRoomDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const { identifiers } = await manager.getRepository(Room).insert({
        code: dto.code,
        floor: dto.floor,
        areaM2: dto.areaM2,
        listedPrice: dto.listedPrice,
        note: dto.note ?? null,
      });
      const id = identifiers[0].id as string;
      await this.auditLogsService.log(manager, ctx, {
        action: 'ROOM_CREATED',
        entityType: 'ROOM',
        entityId: id,
        summary: `Thêm phòng ${dto.code} (tầng ${dto.floor}, ${dto.areaM2} m², giá ${formatMoney(dto.listedPrice)})`,
        after: {
          code: dto.code,
          floor: dto.floor,
          areaM2: dto.areaM2,
          listedPrice: dto.listedPrice,
          isUnderMaintenance: false,
          note: dto.note ?? null,
        },
      });
      return this.findOne(id, manager);
    });
  }

  // ROOM-04 Sửa phòng, đặt hoặc bỏ bảo trì
  async update(id: string, dto: UpdateRoomDto, ctx: RequestContext) {
    if (dto.status !== undefined) throw new AppException('READ_ONLY_FIELD', [
      { field: 'status', code: 'READ_ONLY_FIELD', message: 'Trạng thái phòng do hợp đồng quyết định' },
    ]);

    return this.dataSource.transaction(async (manager) => {
      // Khóa phòng để nhập hợp đồng (CTR-02) không chen vào giữa lúc kiểm tra và lúc ghi
      if (!(await lockRow(manager, 'rooms', id))) throw new AppException('RESOURCE_NOT_FOUND');
      const room = await manager.getRepository(Room).findOneByOrFail({ id });

      if (dto.code !== undefined && dto.code !== room.code) {
        const hasContract = await selectOne(manager, `select 1 from public.contracts where room_id = $1 limit 1`, [id]);
        if (hasContract) throw new AppException('ROOM_CODE_LOCKED');
      }

      if (dto.isUnderMaintenance === true && !room.isUnderMaintenance) {
        const openContract = await selectOne(
          manager,
          `select 1 from public.contracts where room_id = $1 and ended_on is null limit 1`,
          [id],
        );
        if (openContract) throw new AppException('ROOM_HAS_ACTIVE_CONTRACT');
      }

      const changes = definedOnly({
        code: dto.code,
        floor: dto.floor,
        areaM2: dto.areaM2,
        listedPrice: dto.listedPrice,
        note: dto.note,
        isUnderMaintenance: dto.isUnderMaintenance,
      });
      if (Object.keys(changes).length > 0) {
        await manager.getRepository(Room).update({ id }, changes);
        const afterCode = dto.code ?? room.code;
        await this.auditLogsService.log(manager, ctx, {
          action: 'ROOM_UPDATED',
          entityType: 'ROOM',
          entityId: id,
          summary: `Cập nhật phòng ${afterCode}`,
          before: {
            code: room.code,
            floor: room.floor,
            areaM2: room.areaM2,
            listedPrice: room.listedPrice,
            isUnderMaintenance: room.isUnderMaintenance,
            note: room.note,
          },
          after: {
            code: afterCode,
            floor: dto.floor ?? room.floor,
            areaM2: dto.areaM2 ?? room.areaM2,
            listedPrice: dto.listedPrice ?? room.listedPrice,
            isUnderMaintenance: dto.isUnderMaintenance ?? room.isUnderMaintenance,
            note: dto.note !== undefined ? dto.note : room.note,
          },
        });
      }
      return this.findOne(id, manager);
    });
  }
}

function contractSummary(
  id: string | null,
  name: string | null,
  startDate: string | null,
  endDate: string | null,
) {
  return id ? { id, primaryTenantName: name, startDate, endDate } : null;
}

function toRoomResponse(r: RoomRow) {
  return {
    id: r.id,
    code: r.code,
    floor: r.floor,
    areaM2: r.area_m2,
    listedPrice: r.listed_price,
    status: r.status,
    isUnderMaintenance: r.is_under_maintenance,
    note: r.note,
    activeContract: contractSummary(r.active_id, r.active_primary_name, r.active_start_date, r.active_end_date),
    upcomingContract: contractSummary(
      r.upcoming_id,
      r.upcoming_primary_name,
      r.upcoming_start_date,
      r.upcoming_end_date,
    ),
    occupantCount: r.occupant_count,
    createdAt: toVnDateTime(r.created_at),
    updatedAt: toVnDateTime(r.updated_at),
  };
}
