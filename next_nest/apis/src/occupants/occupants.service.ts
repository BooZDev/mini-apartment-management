import { Injectable, StreamableFile } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { CurrentUser } from 'src/auth/types/current-user';
import { DetailCode } from 'src/common/constants/error-codes';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { definedOnly, lockRow, selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { AppException } from 'src/common/exceptions/app.exception';
import { compactDate, vnToday } from 'src/common/utils/date.util';
import { buildWorkbook } from 'src/common/utils/excel.util';
import { ContractOccupant } from 'src/entities/contract-occupant.entity';
import { Occupant } from 'src/entities/occupant.entity';
import { User } from 'src/entities/user.entity';
import { CreateOccupantDto } from './dto/create-occupant.dto';
import { ExportOccupantsDto } from './dto/export-occupants.dto';
import { FindOccupantsDto } from './dto/find-occupants.dto';
import { MoveOutDto } from './dto/move-out.dto';
import { OccupantBaseDto } from './dto/occupant-input.dto';
import { UpdateOccupantDto } from './dto/update-occupant.dto';
import {
  findOccupantsOfContracts,
  OCCUPANT_SELECT,
  OccupantRow,
  occupantVisibility,
  toOccupantDetail,
  toOccupantSummary,
} from './occupant-view';

type OpenContract = { id: string; start_date: string; end_date: string };

// Nhật ký chỉ ghi tên trường cá nhân đã đổi, không ghi giá trị (Chủ nhà đọc được nhật ký)
const PERSONAL_FIELDS = ['dateOfBirth', 'gender', 'hometown', 'idNumber', 'phone', 'email'];

@Injectable()
export class OccupantsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  static toEntity(dto: OccupantBaseDto, userId: string | null = null): Partial<Occupant> {
    return {
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender ?? null,
      hometown: dto.hometown,
      idNumber: dto.idNumber,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      note: dto.note ?? null,
      userId,
    };
  }

  // OCC-01 Danh sách người ở của phòng
  async findByRoom(roomId: string, query: FindOccupantsDto, user: CurrentUser) {
    const manager = this.dataSource.manager;
    if (!(await selectOne(manager, `select 1 from public.rooms where id = $1`, [roomId]))) {
      throw new AppException('RESOURCE_NOT_FOUND');
    }

    const contractId = query.contractId
      ? await this.contractOfRoom(manager, roomId, query.contractId)
      : (await this.openContract(manager, roomId))?.id;
    if (!contractId) return [];

    const rows = await findOccupantsOfContracts(manager, [contractId], query.includeMovedOut ?? false);
    const visibility = occupantVisibility(user.roles);
    return rows.map((r) => toOccupantSummary(r, visibility));
  }

  // OCC-02 Thêm người ở
  create(roomId: string, dto: CreateOccupantDto, ctx: RequestContext) {
    return this.dataSource.transaction((manager) => this.createIn(manager, roomId, dto, ctx));
  }

  async createIn(manager: EntityManager, roomId: string, dto: CreateOccupantDto, ctx: RequestContext) {
    if (!(await lockRow(manager, 'rooms', roomId))) throw new AppException('RESOURCE_NOT_FOUND');

    const contract = dto.contractId
      ? await this.openContractById(manager, roomId, dto.contractId)
      : await this.openContract(manager, roomId);
    if (!contract) throw new AppException('ROOM_NOT_OCCUPIED');

    const today = vnToday();
    const moveInDate = dto.moveInDate ?? (today > contract.start_date ? today : contract.start_date);
    if (moveInDate < contract.start_date || moveInDate > contract.end_date) {
      throw AppException.field('moveInDate', DetailCode.OUT_OF_RANGE, 'Ngày vào ở phải nằm trong thời gian hợp đồng');
    }

    const { identifiers } = await manager.getRepository(Occupant).insert(OccupantsService.toEntity(dto));
    const occupantId = identifiers[0].id as string;

    // Trigger chặn CCCD trùng người ở khác có thời gian ở giao nhau
    await manager.getRepository(ContractOccupant).insert({
      contractId: contract.id,
      occupantId,
      isPrimary: false,
      relationshipToPrimary: dto.relationshipToPrimary ?? null,
      moveInDate,
    });

    await this.auditLogsService.log(manager, ctx, {
      action: 'OCCUPANT_CREATED',
      entityType: 'OCCUPANT',
      entityId: occupantId,
      summary: `Thêm người ở ${dto.fullName}, vào ở ${moveInDate}`,
      after: { contractId: contract.id, fullName: dto.fullName, moveInDate },
    });
    return toOccupantDetail(await this.findRow(manager, occupantId));
  }

  // OCC-03 Chi tiết người ở, có ghi nhật ký xem dữ liệu cá nhân
  findOne(id: string, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const row = await this.findRow(manager, id);
      await this.auditLogsService.log(manager, ctx, {
        action: 'PERSONAL_DATA_VIEWED',
        entityType: 'OCCUPANT',
        entityId: id,
        summary: `Xem thông tin cá nhân của ${row.full_name} (phòng ${row.room_code})`,
      });
      return toOccupantDetail(row);
    });
  }

  // OCC-04 Sửa người ở, tình trạng tạm trú
  update(id: string, dto: UpdateOccupantDto, ctx: RequestContext) {
    return this.dataSource.transaction((manager) => this.updateIn(manager, id, dto, ctx));
  }

  async updateIn(manager: EntityManager, id: string, dto: UpdateOccupantDto, ctx: RequestContext) {
    if (!(await lockRow(manager, 'occupants', id))) throw new AppException('RESOURCE_NOT_FOUND');
    const before = await this.findRow(manager, id);

    const changes = definedOnly({
      fullName: dto.fullName,
      dateOfBirth: dto.dateOfBirth,
      gender: dto.gender,
      hometown: dto.hometown,
      idNumber: dto.idNumber,
      phone: dto.phone,
      email: dto.email,
      note: dto.note,
      residenceRegistrationStatus: dto.residenceRegistrationStatus,
    });
    if (Object.keys(changes).length > 0) {
      await manager.getRepository(Occupant).update({ id }, changes);
    }
    // Họ tên của tài khoản người thuê theo người đứng tên
    if (dto.fullName !== undefined && before.user_id) {
      await manager.getRepository(User).update({ id: before.user_id }, { fullName: dto.fullName });
    }
    if (dto.relationshipToPrimary !== undefined && !before.is_primary) {
      await manager
        .getRepository(ContractOccupant)
        .update({ id: before.stay_id }, { relationshipToPrimary: dto.relationshipToPrimary });
    }

    const changedFields = Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
    if (changedFields.length > 0) {
      await this.auditLogsService.log(manager, ctx, {
        action: 'OCCUPANT_UPDATED',
        entityType: 'OCCUPANT',
        entityId: id,
        summary: `Sửa thông tin người ở ${before.full_name}`,
        after: {
          changedFields,
          ...Object.fromEntries(
            changedFields
              .filter((k) => !PERSONAL_FIELDS.includes(k))
              .map((k) => [k, (dto as Record<string, unknown>)[k]]),
          ),
        },
      });
    }
    return toOccupantDetail(await this.findRow(manager, id));
  }

  // OCC-05 Ghi nhận người rời đi
  moveOut(id: string, dto: MoveOutDto, ctx: RequestContext) {
    return this.dataSource.transaction((manager) => this.moveOutIn(manager, id, dto, ctx));
  }

  async moveOutIn(manager: EntityManager, id: string, dto: MoveOutDto, ctx: RequestContext) {
    if (!(await lockRow(manager, 'occupants', id))) throw new AppException('RESOURCE_NOT_FOUND');
    const row = await this.findRow(manager, id);

    // Người đứng tên rời đi thì kết thúc hợp đồng (CTR-04)
    if (row.is_primary) throw new AppException('PRIMARY_TENANT_CANNOT_MOVE_OUT');
    if (row.move_out_date) throw new AppException('OCCUPANT_ALREADY_MOVED_OUT');
    if (dto.moveOutDate < row.move_in_date) {
      throw AppException.field('moveOutDate', DetailCode.OUT_OF_RANGE, 'Ngày rời đi không được trước ngày vào ở');
    }

    await manager.getRepository(ContractOccupant).update({ id: row.stay_id }, { moveOutDate: dto.moveOutDate });
    await this.auditLogsService.log(manager, ctx, {
      action: 'OCCUPANT_MOVED_OUT',
      entityType: 'OCCUPANT',
      entityId: id,
      summary: `${row.full_name} rời phòng ${row.room_code} ngày ${dto.moveOutDate}`,
      after: { moveOutDate: dto.moveOutDate },
    });
    return toOccupantDetail(await this.findRow(manager, id));
  }

  // OCC-06 Xuất danh sách người ở (hợp đồng chưa kết thúc) để khai báo tạm trú
  export(query: ExportOccupantsDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const where = new WhereBuilder().add('c.ended_on is null').add('not o.is_anonymized');
      if (query.roomId) where.add('c.room_id = ?', query.roomId);
      if (!query.includeMovedOut) where.add('co.move_out_date is null');
      const rows = await selectRows<OccupantRow>(
        manager,
        `${OCCUPANT_SELECT} ${where.sql} order by r.code, co.is_primary desc, co.move_in_date, o.full_name`,
        where.params,
      );

      await this.auditLogsService.log(manager, ctx, {
        action: 'PERSONAL_DATA_EXPORTED',
        entityType: 'OCCUPANT',
        entityId: null,
        summary: `Xuất danh sách ${rows.length} người ở${query.roomId ? ` của phòng ${rows[0]?.room_code ?? ''}` : ''}`,
        after: { roomId: query.roomId ?? null, includeMovedOut: query.includeMovedOut ?? false, count: rows.length },
      });

      const buffer = await buildWorkbook('Người ở', [
        { header: 'Phòng', width: 10, value: (r: OccupantRow) => r.room_code },
        { header: 'Họ tên', width: 26, value: (r: OccupantRow) => r.full_name },
        { header: 'Người đứng tên', width: 14, value: (r: OccupantRow) => (r.is_primary ? 'Có' : '') },
        { header: 'Quan hệ', width: 16, value: (r: OccupantRow) => r.relationship_to_primary },
        { header: 'Ngày sinh', width: 12, value: (r: OccupantRow) => r.date_of_birth },
        { header: 'Giới tính', width: 10, value: (r: OccupantRow) => r.gender },
        { header: 'Quê quán', width: 22, value: (r: OccupantRow) => r.hometown },
        { header: 'CCCD', width: 15, value: (r: OccupantRow) => r.id_number },
        { header: 'SĐT', width: 13, value: (r: OccupantRow) => r.phone },
        { header: 'Ngày vào ở', width: 12, value: (r: OccupantRow) => r.move_in_date },
        { header: 'Ngày rời đi', width: 12, value: (r: OccupantRow) => r.move_out_date },
        {
          header: 'Tạm trú',
          width: 14,
          value: (r: OccupantRow) => (r.residence_registration_status === 'REGISTERED' ? 'Đã khai báo' : 'Chưa khai báo'),
        },
      ], rows);

      return new StreamableFile(buffer, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="nguoi-o-${compactDate(vnToday())}.xlsx"`,
      });
    });
  }

  /** Thời gian ở gần nhất (mỗi hồ sơ người ở gắn một hợp đồng). */
  async findRow(manager: EntityManager, occupantId: string) {
    const row = await selectOne<OccupantRow>(
      manager,
      `${OCCUPANT_SELECT} where o.id = $1 order by co.move_in_date desc limit 1`,
      [occupantId],
    );
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return row;
  }

  // Hợp đồng chưa kết thúc của phòng: hiệu lực trước, không có thì sắp hiệu lực
  private openContract(manager: EntityManager, roomId: string) {
    return selectOne<OpenContract>(
      manager,
      `select id, start_date, end_date from public.contracts
        where room_id = $1 and ended_on is null
        order by (start_date <= $2::date) desc, start_date
        limit 1`,
      [roomId, vnToday()],
    );
  }

  private openContractById(manager: EntityManager, roomId: string, contractId: string) {
    return selectOne<OpenContract>(
      manager,
      `select id, start_date, end_date from public.contracts where id = $1 and room_id = $2 and ended_on is null`,
      [contractId, roomId],
    );
  }

  private async contractOfRoom(manager: EntityManager, roomId: string, contractId: string) {
    const row = await selectOne<{ id: string }>(
      manager,
      `select id from public.contracts where id = $1 and room_id = $2`,
      [contractId, roomId],
    );
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return row.id;
  }
}
