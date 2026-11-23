import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';
import { CurrentUser } from 'src/auth/types/current-user';
import { DetailCode } from 'src/common/constants/error-codes';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { lockRow, selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException } from 'src/common/exceptions/app.exception';
import { validationDetails } from 'src/common/pipes/validation.pipe';
import { toVnDateTime } from 'src/common/utils/date.util';
import { NotificationType } from 'src/notifications/enums/notification-type.enum';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateOccupantDto } from 'src/occupants/dto/create-occupant.dto';
import { MoveOutDto } from 'src/occupants/dto/move-out.dto';
import { OccupantInputDto } from 'src/occupants/dto/occupant-input.dto';
import { UpdateOccupantDto } from 'src/occupants/dto/update-occupant.dto';
import { OccupantsService } from 'src/occupants/occupants.service';
import { UserStatus } from 'src/users/enums/user-status.enum';
import {
  CreateTenantRequestDto,
  FindTenantRequestsDto,
  MaintenanceStatus,
  OccupantChangeAction,
  RequestType,
  ResponseNoteDto,
  UpdateMaintenanceStatusDto,
} from './dto/tenant-request.dto';

type RequestRow = {
  id: string;
  type: RequestType;
  room_id: string;
  room_code: string;
  contract_id: string;
  title: string;
  description: string | null;
  occupant_change_action: OccupantChangeAction | null;
  target_occupant_id: string | null;
  proposed_data: Record<string, unknown> | null;
  move_out_date: string | null;
  status: string;
  submitted_by: string;
  submitted_by_name: string;
  submitted_at: Date;
  handled_by: string | null;
  handled_by_name: string | null;
  handled_at: Date | null;
  response_note: string | null;
  total?: number;
};

const REQUEST_SELECT = `
  select t.id, t.type, t.room_id, r.code as room_code, t.contract_id, t.title, t.description,
         t.occupant_change_action, t.target_occupant_id, t.proposed_data, t.move_out_date, t.status,
         t.submitted_by, su.full_name as submitted_by_name, t.submitted_at,
         t.handled_by, hu.full_name as handled_by_name, t.handled_at, t.response_note
    from public.tenant_requests t
    join public.rooms r on r.id = t.room_id
    join public.users su on su.id = t.submitted_by
    left join public.users hu on hu.id = t.handled_by`;

// REQ-05: chuyển trạng thái hợp lệ của yêu cầu sửa chữa
const MAINTENANCE_TRANSITIONS: Record<string, MaintenanceStatus[]> = {
  NEW: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.REJECTED],
  IN_PROGRESS: [MaintenanceStatus.DONE, MaintenanceStatus.REJECTED],
};

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'đã được duyệt',
  REJECTED: 'bị từ chối',
  IN_PROGRESS: 'đang được xử lý',
  DONE: 'đã hoàn thành',
};

@Injectable()
export class TenantRequestsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly occupantsService: OccupantsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // TEN-07 Gửi yêu cầu: phòng, hợp đồng lấy từ phiên đăng nhập
  async create(user: CurrentUser, dto: CreateTenantRequestDto) {
    if (user.status === UserStatus.READ_ONLY) throw new AppException('TENANT_READ_ONLY');
    const tenant = user.tenant;
    if (!tenant) throw new AppException('RESOURCE_NOT_FOUND');

    let action: OccupantChangeAction | null = null;
    let targetId: string | null = null;
    let proposed: Record<string, unknown> | null = null;
    let moveOutDate: string | null = null;

    if (dto.type === RequestType.MAINTENANCE) {
      if (dto.occupantChange) {
        throw AppException.field('occupantChange', DetailCode.INVALID_FORMAT, 'Yêu cầu sửa chữa không kèm thay đổi người ở');
      }
    } else {
      const change = dto.occupantChange;
      if (!change) throw AppException.field('occupantChange', DetailCode.REQUIRED, 'Cần thông tin thay đổi người ở');
      action = change.action;

      if (action !== OccupantChangeAction.ADD) {
        if (!change.occupantId) {
          throw AppException.field('occupantChange.occupantId', DetailCode.REQUIRED, 'Chưa chọn người ở');
        }
        const own = await selectOne(
          this.dataSource.manager,
          `select 1 from public.contract_occupants where contract_id = $1 and occupant_id = $2`,
          [tenant.contractId, change.occupantId],
        );
        // Người ở không thuộc phòng mình: không lộ là có tồn tại
        if (!own) throw new AppException('RESOURCE_NOT_FOUND');
        targetId = change.occupantId;
      }
      if (action === OccupantChangeAction.MOVE_OUT) {
        if (!change.moveOutDate) {
          throw AppException.field('occupantChange.moveOutDate', DetailCode.REQUIRED, 'Chưa nhập ngày rời đi');
        }
        moveOutDate = change.moveOutDate;
      } else {
        if (!change.proposedData) {
          throw AppException.field('occupantChange.proposedData', DetailCode.REQUIRED, 'Chưa nhập thông tin người ở');
        }
        const cls: new () => object = action === OccupantChangeAction.ADD ? OccupantInputDto : UpdateOccupantDto;
        proposed = { ...(await validated(cls, change.proposedData, 'occupantChange.proposedData')) };
        if (Object.keys(proposed).length === 0) {
          throw AppException.field('occupantChange.proposedData', DetailCode.REQUIRED, 'Chưa có trường nào cần đổi');
        }
      }
    }

    const row = await selectOne<{ id: string }>(
      this.dataSource.manager,
      `insert into public.tenant_requests
         (type, room_id, contract_id, title, description, occupant_change_action, target_occupant_id,
          proposed_data, move_out_date, status, submitted_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11) returning id`,
      [
        dto.type,
        tenant.roomId,
        tenant.contractId,
        dto.title,
        dto.description ?? null,
        action,
        targetId,
        proposed ? JSON.stringify(proposed) : null,
        moveOutDate,
        dto.type === RequestType.MAINTENANCE ? MaintenanceStatus.NEW : 'PENDING',
        user.id,
      ],
    );
    return this.findOne(row!.id);
  }

  // TEN-08 Yêu cầu đã gửi; REQ-01 Danh sách yêu cầu
  async findAll(query: FindTenantRequestsDto, contractId?: string) {
    const where = new WhereBuilder();
    if (contractId) where.add('t.contract_id = ?', contractId);
    if (query.type) where.add('t.type = ?', query.type);
    if (query.status) where.add('t.status = ?', query.status);
    if (query.roomId) where.add('t.room_id = ?', query.roomId);
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);
    const rows = await selectRows<RequestRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total from (${REQUEST_SELECT} ${where.sql}) x
        order by x.submitted_at desc, x.id limit ${limit} offset ${offset}`,
      where.params,
    );
    return new Paginated(rows.map(toRequest), query.page, query.pageSize, rows[0]?.total ?? 0);
  }

  // REQ-02 Chi tiết yêu cầu
  async findOne(id: string, manager: EntityManager = this.dataSource.manager) {
    const row = await selectOne<RequestRow>(manager, `${REQUEST_SELECT} where t.id = $1`, [id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    return toRequest(row);
  }

  // REQ-03 Duyệt yêu cầu thay đổi người ở: áp dụng qua chức năng người ở trong cùng giao dịch
  approve(id: string, dto: ResponseNoteDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.lockPending(manager, id, RequestType.OCCUPANT_CHANGE);
      const data = request.occupantChange?.proposedData ?? {};

      switch (request.occupantChange?.action) {
        case OccupantChangeAction.ADD:
          await this.occupantsService.createIn(
            manager,
            request.roomId,
            await validated(CreateOccupantDto, { ...data, contractId: request.contractId }, 'proposedData'),
            ctx,
          );
          break;
        case OccupantChangeAction.UPDATE:
          await this.occupantsService.updateIn(
            manager,
            request.occupantChange.occupantId as string,
            await validated(UpdateOccupantDto, data, 'proposedData'),
            ctx,
          );
          break;
        case OccupantChangeAction.MOVE_OUT:
          await this.occupantsService.moveOutIn(
            manager,
            request.occupantChange.occupantId as string,
            await validated(MoveOutDto, { moveOutDate: request.occupantChange.moveOutDate }, 'moveOutDate'),
            ctx,
          );
          break;
      }
      return this.close(manager, id, 'APPROVED', dto.responseNote ?? null, ctx);
    });
  }

  // REQ-04 Từ chối yêu cầu thay đổi người ở
  reject(id: string, dto: ResponseNoteDto, ctx: RequestContext) {
    if (!dto.responseNote) throw AppException.field('responseNote', DetailCode.REQUIRED, 'Cần ghi lý do từ chối');
    return this.dataSource.transaction(async (manager) => {
      await this.lockPending(manager, id, RequestType.OCCUPANT_CHANGE);
      return this.close(manager, id, 'REJECTED', dto.responseNote as string, ctx);
    });
  }

  // REQ-05 Cập nhật trạng thái yêu cầu sửa chữa
  updateStatus(id: string, dto: UpdateMaintenanceStatusDto, ctx: RequestContext) {
    if (dto.status === MaintenanceStatus.REJECTED && !dto.responseNote) {
      throw AppException.field('responseNote', DetailCode.REQUIRED, 'Cần ghi lý do từ chối');
    }
    return this.dataSource.transaction(async (manager) => {
      if (!(await lockRow(manager, 'tenant_requests', id))) throw new AppException('RESOURCE_NOT_FOUND');
      const request = await this.findOne(id, manager);
      if (request.type !== RequestType.MAINTENANCE) throw new AppException('INVALID_REQUEST_TYPE');
      if (!MAINTENANCE_TRANSITIONS[request.status]?.includes(dto.status)) {
        throw new AppException('INVALID_STATUS_TRANSITION');
      }
      return this.close(manager, id, dto.status, dto.responseNote ?? request.responseNote, ctx);
    });
  }

  private async lockPending(manager: EntityManager, id: string, type: RequestType) {
    if (!(await lockRow(manager, 'tenant_requests', id))) throw new AppException('RESOURCE_NOT_FOUND');
    const request = await this.findOne(id, manager);
    if (request.type !== type) throw new AppException('INVALID_REQUEST_TYPE');
    if (request.status !== 'PENDING') throw new AppException('REQUEST_ALREADY_PROCESSED');
    return request;
  }

  /** Ghi trạng thái mới; trạng thái kết thúc thì báo cho người gửi. */
  private async close(manager: EntityManager, id: string, status: string, note: string | null, ctx: RequestContext) {
    await manager.query(
      `update public.tenant_requests set status = $2, handled_by = $3, handled_at = now(), response_note = $4 where id = $1`,
      [id, status, ctx.user.id, note],
    );
    const request = await this.findOne(id, manager);
    if (status !== MaintenanceStatus.IN_PROGRESS) {
      await this.notificationsService.create(manager, {
        userId: request.submittedBy.id,
        type: NotificationType.REQUEST_PROCESSED,
        title: `Yêu cầu ${STATUS_LABELS[status] ?? 'đã được xử lý'}`,
        message: `Yêu cầu "${request.title}" ${STATUS_LABELS[status] ?? 'đã được xử lý'}${note ? `: ${note}` : ''}`,
        relatedType: 'REQUEST',
        relatedId: id,
      });
    }
    return request;
  }
}

/** Kiểm tra dữ liệu lưu dạng JSON bằng đúng DTO của chức năng người ở. */
async function validated<T extends object>(cls: new () => T, plain: Record<string, unknown>, field: string): Promise<T> {
  const dto = plainToInstance(cls, plain);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) throw new AppException('VALIDATION_ERROR', validationDetails(errors, field));
  return dto;
}

function toRequest(r: RequestRow) {
  return {
    id: r.id,
    type: r.type,
    roomId: r.room_id,
    roomCode: r.room_code,
    contractId: r.contract_id,
    title: r.title,
    description: r.description,
    occupantChange: r.occupant_change_action
      ? {
          action: r.occupant_change_action,
          occupantId: r.target_occupant_id,
          proposedData: r.proposed_data,
          moveOutDate: r.move_out_date,
        }
      : null,
    status: r.status,
    submittedBy: { id: r.submitted_by, fullName: r.submitted_by_name },
    submittedAt: toVnDateTime(r.submitted_at),
    handledBy: r.handled_by ? { id: r.handled_by, fullName: r.handled_by_name } : null,
    handledAt: toVnDateTime(r.handled_at),
    responseNote: r.response_note,
  };
}
