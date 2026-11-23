import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { Role } from 'src/auth/enums/role.enum';
import { CurrentUser } from 'src/auth/types/current-user';
import { DetailCode } from 'src/common/constants/error-codes';
import { RequestContext } from 'src/common/decorators/request-context.decorator';
import { lockRow, selectOne, selectRows, WhereBuilder } from 'src/common/database/query.util';
import { Paginated } from 'src/common/dto/paginated.dto';
import { AppException, ErrorDetail } from 'src/common/exceptions/app.exception';
import { addDays, periodOf, previousPeriod, toVnDateTime, vnToday } from 'src/common/utils/date.util';
import { generateTemporaryPassword, hashPassword } from 'src/common/utils/password.util';
import { buildOrderBy } from 'src/common/utils/sort.util';
import { likeContains, sqlUnaccent } from 'src/common/utils/text.util';
import { ContractOccupant } from 'src/entities/contract-occupant.entity';
import { ContractRenewal } from 'src/entities/contract-renewal.entity';
import { ContractService } from 'src/entities/contract-service.entity';
import { Contract } from 'src/entities/contract.entity';
import { Occupant } from 'src/entities/occupant.entity';
import { UserRole } from 'src/entities/user-role.entity';
import { User } from 'src/entities/user.entity';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import {
  findOccupantsOfContracts,
  OccupantVisibility,
  occupantVisibility,
  toOccupantSummary,
} from 'src/occupants/occupant-view';
import { OccupantsService } from 'src/occupants/occupants.service';
import {
  ContractServiceInputDto,
  CreateContractDto,
  MeterReadingInputDto,
} from './dto/create-contract.dto';
import { FindContractsDto } from './dto/find-contracts.dto';
import { RenewContractDto } from './dto/renew-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateServicesDto } from './dto/update-services.dto';
import { ContractStatus, MeterType } from './enums/contract.enum';

type ContractRow = {
  id: string;
  room_id: string;
  room_code: string;
  contract_number: string | null;
  signed_on: string;
  primary_occupant_id: string;
  primary_name: string;
  tenant_user_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  current_monthly_rent: number;
  deposit: number;
  initial_electricity_reading: number | null;
  initial_water_reading: number | null;
  note: string | null;
  ended_on: string | null;
  end_note: string | null;
  final_electricity_reading: number | null;
  final_water_reading: number | null;
  deposit_refund_amount: number | null;
  settlement_invoice_id: string | null;
  deposit_applied: number;
  status: ContractStatus;
  created_at: Date;
  total?: number;
};

type ServiceRow = {
  contract_id: string;
  charge_type_id: string;
  charge_type_name: string;
  quantity: number;
  from_period: string;
  to_period: string | null;
};

type RenewalRow = {
  contract_id: string;
  addendum_number: string | null;
  signed_on: string;
  previous_end_date: string;
  new_end_date: string;
  monthly_rent: number | null;
  effective_from: string;
};

// Trạng thái tính khi đọc ($1 là hôm nay); giá thuê hiện hành theo lần gia hạn đã có hiệu lực
const CONTRACT_SELECT = `
  select c.id, c.room_id, r.code as room_code, c.contract_number, c.signed_on,
         c.primary_occupant_id, o.full_name as primary_name, c.tenant_user_id,
         c.start_date, c.end_date, c.monthly_rent, c.deposit,
         coalesce((select cr.monthly_rent from public.contract_renewals cr
                    where cr.contract_id = c.id and cr.monthly_rent is not null and cr.effective_from <= $1::date
                    order by cr.effective_from desc limit 1), c.monthly_rent) as current_monthly_rent,
         c.initial_electricity_reading, c.initial_water_reading, c.note, c.ended_on, c.end_note,
         c.final_electricity_reading, c.final_water_reading, c.deposit_refund_amount,
         (select i.id from public.invoices i
           where i.contract_id = c.id and i.invoice_type = 'SETTLEMENT') as settlement_invoice_id,
         coalesce((select sum(p.amount) from public.payments p
                     join public.invoices i on i.id = p.invoice_id
                    where i.contract_id = c.id and p.method = 'DEPOSIT' and p.status <> 'CANCELLED'), 0) as deposit_applied,
         case when c.ended_on is not null then 'ENDED'
              when c.start_date > $1::date then 'UPCOMING'
              else 'ACTIVE' end as status,
         c.created_at
    from public.contracts c
    join public.rooms r on r.id = c.room_id
    join public.occupants o on o.id = c.primary_occupant_id`;

const STATUS_FILTERS: Record<ContractStatus, string> = {
  [ContractStatus.ENDED]: 'c.ended_on is not null',
  [ContractStatus.UPCOMING]: 'c.ended_on is null and c.start_date > $1::date',
  [ContractStatus.ACTIVE]: 'c.ended_on is null and c.start_date <= $1::date',
};

const SORT_FIELDS = {
  startDate: 'x.start_date',
  endDate: 'x.end_date',
  roomCode: 'x.room_code',
  createdAt: 'x.created_at',
};

const METER_LABELS: Record<MeterType, string> = {
  [MeterType.ELECTRICITY]: 'điện',
  [MeterType.WATER]: 'nước',
};

@Injectable()
export class ContractsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  // CTR-01 Danh sách hợp đồng (không kèm người ở)
  async findAll(query: FindContractsDto) {
    const today = vnToday();
    const where = new WhereBuilder();
    where.param(today);
    if (query.roomId) where.add('c.room_id = ?', query.roomId);
    if (query.status) where.add(STATUS_FILTERS[query.status]);
    if (query.expiringWithinDays !== undefined) {
      where.add(
        `${STATUS_FILTERS[ContractStatus.ACTIVE]} and c.end_date between $1::date and ?::date`,
        addDays(today, query.expiringWithinDays),
      );
    }
    if (query.q) {
      const like = likeContains(query.q);
      where.add(
        `(${sqlUnaccent('o.full_name')} like ? escape '\\' or lower(r.code) like ? escape '\\')`,
        like,
        like,
      );
    }

    const orderBy = buildOrderBy(query.sort, SORT_FIELDS, '-startDate', 'x.id');
    const limit = where.param(query.pageSize);
    const offset = where.param((query.page - 1) * query.pageSize);

    const rows = await selectRows<ContractRow>(
      this.dataSource.manager,
      `select x.*, count(*) over () as total
         from (${CONTRACT_SELECT} ${where.sql}) x
        order by ${orderBy}
        limit ${limit} offset ${offset}`,
      where.params,
    );

    const data = await this.toResponses(this.dataSource.manager, rows, 'NONE', false);
    return new Paginated(data, query.page, query.pageSize, rows[0]?.total ?? 0);
  }

  // CTR-03 Chi tiết hợp đồng, người ở lọc trường theo vai trò
  async findOne(id: string, user: CurrentUser) {
    return this.findView(this.dataSource.manager, id, occupantVisibility(user.roles));
  }

  async findView(manager: EntityManager, id: string, visibility: OccupantVisibility) {
    const row = await selectOne<ContractRow>(manager, `${CONTRACT_SELECT} where c.id = $2`, [vnToday(), id]);
    if (!row) throw new AppException('RESOURCE_NOT_FOUND');
    const [contract] = await this.toResponses(manager, [row], visibility, visibility !== 'NONE');
    return contract;
  }

  // CTR-02 Nhập hợp đồng đã ký giấy, tạo tài khoản người thuê (một giao dịch)
  async create(dto: CreateContractDto, ctx: RequestContext, idempotencyKey?: string) {
    this.assertDistinctIdNumbers(dto);

    // Băm mật khẩu trước để giao dịch đang khóa phòng ngắn nhất
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    return this.idempotencyService.run(
      {
        key: idempotencyKey,
        required: false,
        userId: ctx.user.id,
        endpoint: 'POST /contracts',
        payload: dto,
        status: 201,
        // Không lưu mật khẩu tạm vào CSDL
        redact: (result) => ({
          ...result,
          tenantAccount: { ...result.tenantAccount, temporaryPassword: null },
        }),
      },
      async (manager: EntityManager) => {
        // Khóa phòng: hai QL nhập cùng lúc thì chỉ một người thành công
        if (!(await lockRow(manager, 'rooms', dto.roomId))) throw new AppException('RESOURCE_NOT_FOUND');
        const room = await selectOne<{ code: string; is_under_maintenance: boolean }>(
          manager,
          `select code, is_under_maintenance from public.rooms where id = $1`,
          [dto.roomId],
        );
        if (room?.is_under_maintenance) throw new AppException('ROOM_UNDER_MAINTENANCE');
        await this.assertNoOverlap(manager, dto.roomId, dto.startDate, dto.endDate);
        await this.assertInitialReadings(manager, dto.initialReadings);
        await this.assertServices(manager, dto.services ?? [], 'services');

        // Tài khoản mới vai trò TENANT, kể cả người từng thuê trước đây
        const { identifiers: userIds } = await manager.getRepository(User).insert({
          username: dto.tenantUsername,
          passwordHash,
          fullName: dto.primaryTenant.fullName,
          phone: dto.primaryTenant.phone ?? null,
          email: dto.primaryTenant.email ?? null,
          mustChangePassword: true,
        });
        const tenantUserId = userIds[0].id as string;
        await manager.getRepository(UserRole).insert({
          userId: tenantUserId,
          role: Role.TENANT,
          assignedBy: ctx.user.id,
        });

        const occupantRepo = manager.getRepository(Occupant);
        const { identifiers: primaryIds } = await occupantRepo.insert(
          OccupantsService.toEntity(dto.primaryTenant, tenantUserId),
        );
        const primaryOccupantId = primaryIds[0].id as string;

        const { identifiers: contractIds } = await manager.getRepository(Contract).insert({
          roomId: dto.roomId,
          contractNumber: dto.contractNumber ?? null,
          signedOn: dto.signedOn,
          primaryOccupantId,
          tenantUserId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          monthlyRent: dto.monthlyRent,
          deposit: dto.deposit,
          ...readingColumns(dto.initialReadings),
          note: dto.note ?? null,
          createdBy: ctx.user.id,
        });
        const contractId = contractIds[0].id as string;

        const stayRepo = manager.getRepository(ContractOccupant);
        await stayRepo.insert({
          contractId,
          occupantId: primaryOccupantId,
          isPrimary: true,
          moveInDate: dto.startDate,
        });
        for (const person of dto.additionalOccupants ?? []) {
          const { identifiers } = await occupantRepo.insert(OccupantsService.toEntity(person));
          await stayRepo.insert({
            contractId,
            occupantId: identifiers[0].id as string,
            isPrimary: false,
            relationshipToPrimary: person.relationshipToPrimary,
            moveInDate: dto.startDate,
          });
        }

        // Dịch vụ đăng ký từ kỳ chứa ngày bắt đầu
        await this.insertServices(manager, contractId, dto.services ?? [], periodOf(dto.startDate));

        await this.auditLogsService.log(manager, ctx, {
          action: 'CONTRACT_CREATED',
          entityType: 'CONTRACT',
          entityId: contractId,
          summary: `Nhập hợp đồng phòng ${room?.code}: ${dto.startDate} đến ${dto.endDate}`,
          after: {
            roomCode: room?.code,
            contractNumber: dto.contractNumber ?? null,
            startDate: dto.startDate,
            endDate: dto.endDate,
            monthlyRent: dto.monthlyRent,
            deposit: dto.deposit,
            tenantUsername: dto.tenantUsername,
            occupantCount: 1 + (dto.additionalOccupants?.length ?? 0),
          },
        });

        return {
          contract: await this.findView(manager, contractId, 'FULL'),
          tenantAccount: {
            userId: tenantUserId,
            username: dto.tenantUsername,
            temporaryPassword: temporaryPassword as string | null,
          },
        };
      },
    );
  }

  // CTR-05 Cập nhật dịch vụ đăng ký từ một kỳ
  async updateServices(id: string, dto: UpdateServicesDto) {
    return this.dataSource.transaction(async (manager) => {
      const contract = await this.lockOpenContract(manager, id);

      if (dto.fromPeriod < periodOf(contract.startDate) || dto.fromPeriod > periodOf(contract.endDate)) {
        throw AppException.field('fromPeriod', DetailCode.OUT_OF_RANGE, 'Kỳ áp dụng phải nằm trong thời gian hợp đồng');
      }
      const issued = await selectOne(
        manager,
        `select 1 from public.invoices i
           join public.billing_periods bp on bp.id = i.period_id
          where i.contract_id = $1 and i.invoice_type = 'MONTHLY' and bp.period >= $2
          limit 1`,
        [id, dto.fromPeriod],
      );
      if (issued) throw new AppException('PERIOD_ALREADY_ISSUED');
      await this.assertServices(manager, dto.services, 'services');

      // Dòng từ kỳ áp dụng trở đi bị thay; dòng đang chạy dừng ở kỳ trước
      await manager.query(
        `delete from public.contract_services where contract_id = $1 and from_period >= $2`,
        [id, dto.fromPeriod],
      );
      await manager.query(
        `update public.contract_services set to_period = $3
          where contract_id = $1 and (to_period is null or to_period >= $2)`,
        [id, dto.fromPeriod, previousPeriod(dto.fromPeriod)],
      );
      await this.insertServices(manager, id, dto.services, dto.fromPeriod);

      return this.findView(manager, id, 'FULL');
    });
  }

  // CTR-06 Sửa thông tin hợp đồng nhập sai
  async update(id: string, dto: UpdateContractDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const before = await this.lockOpenContract(manager, id);

      const startDate = dto.startDate ?? before.startDate;
      const endDate = dto.endDate ?? before.endDate;
      if (endDate <= startDate) {
        throw AppException.field(
          dto.endDate !== undefined ? 'endDate' : 'startDate',
          DetailCode.END_BEFORE_START,
          'Ngày kết thúc phải sau ngày bắt đầu',
        );
      }

      const readings = dto.initialReadings ? readingColumns(dto.initialReadings, before) : {};
      const startChanged = startDate !== before.startDate;
      const moneyChanged =
        startChanged ||
        (dto.monthlyRent !== undefined && dto.monthlyRent !== before.monthlyRent) ||
        Object.entries(readings).some(([k, v]) => before[k as keyof Contract] !== v);
      if (moneyChanged) {
        // Sai về tiền trên hóa đơn đã phát hành dùng phiếu điều chỉnh
        const invoiced = await selectOne(manager, `select 1 from public.invoices where contract_id = $1 limit 1`, [id]);
        if (invoiced) throw new AppException('CONTRACT_HAS_INVOICE');
      }

      if (endDate !== before.endDate) {
        const renewed = await selectOne(manager, `select 1 from public.contract_renewals where contract_id = $1 limit 1`, [id]);
        if (renewed) {
          throw AppException.field('endDate', DetailCode.OUT_OF_RANGE, 'Hợp đồng đã gia hạn, không sửa được ngày kết thúc');
        }
      }
      if (startChanged || endDate !== before.endDate) {
        await lockRow(manager, 'rooms', before.roomId);
        await this.assertNoOverlap(manager, before.roomId, startDate, endDate, id);
      }

      const changes: Partial<Contract> = {
        ...(dto.contractNumber !== undefined && { contractNumber: dto.contractNumber }),
        ...(dto.signedOn !== undefined && { signedOn: dto.signedOn }),
        ...(dto.startDate !== undefined && { startDate }),
        ...(dto.endDate !== undefined && { endDate }),
        ...(dto.monthlyRent !== undefined && { monthlyRent: dto.monthlyRent }),
        ...(dto.deposit !== undefined && { deposit: dto.deposit }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...readings,
      };
      if (Object.keys(changes).length > 0) {
        await manager.getRepository(Contract).update({ id }, changes);
      }

      if (startChanged) {
        // Người vào ở từ đầu hợp đồng, dịch vụ từ kỳ đầu đổi theo ngày bắt đầu mới
        await manager.query(
          `update public.contract_occupants set move_in_date = $3 where contract_id = $1 and move_in_date = $2`,
          [id, before.startDate, startDate],
        );
        await manager.query(
          `update public.contract_services set from_period = $3 where contract_id = $1 and from_period = $2`,
          [id, periodOf(before.startDate), periodOf(startDate)],
        );
      }

      if (Object.keys(changes).length > 0) {
        await this.auditLogsService.log(manager, ctx, {
          action: 'CONTRACT_UPDATED',
          entityType: 'CONTRACT',
          entityId: id,
          summary: `Sửa thông tin hợp đồng nhập sai (${Object.keys(changes).join(', ')})`,
          before: Object.fromEntries(Object.keys(changes).map((k) => [k, before[k as keyof Contract]])),
          after: changes,
        });
      }

      return this.findView(manager, id, 'FULL');
    });
  }

  // CTR-07 Gia hạn hợp đồng theo phụ lục
  async renew(id: string, dto: RenewContractDto, ctx: RequestContext) {
    return this.dataSource.transaction(async (manager) => {
      const contract = await this.lockOpenContract(manager, id);
      if (dto.newEndDate <= contract.endDate) {
        throw AppException.field('newEndDate', DetailCode.OUT_OF_RANGE, 'Ngày kết thúc mới phải sau ngày kết thúc hiện tại');
      }

      await manager.getRepository(ContractRenewal).insert({
        contractId: id,
        addendumNumber: dto.addendumNumber ?? null,
        signedOn: dto.signedOn,
        previousEndDate: contract.endDate,
        newEndDate: dto.newEndDate,
        monthlyRent: dto.newMonthlyRent ?? null,
        effectiveFrom: addDays(contract.endDate, 1),
        note: dto.note ?? null,
        createdBy: ctx.user.id,
      });
      // CSDL chặn gia hạn đè lên hợp đồng của người thuê kế tiếp
      await manager.getRepository(Contract).update({ id }, { endDate: dto.newEndDate });

      await this.auditLogsService.log(manager, ctx, {
        action: 'CONTRACT_RENEWED',
        entityType: 'CONTRACT',
        entityId: id,
        summary: `Gia hạn hợp đồng đến ${dto.newEndDate}`,
        before: { endDate: contract.endDate },
        after: { endDate: dto.newEndDate, monthlyRent: dto.newMonthlyRent ?? null, addendumNumber: dto.addendumNumber ?? null },
      });

      return this.findView(manager, id, 'FULL');
    });
  }

  private async lockOpenContract(manager: EntityManager, id: string) {
    if (!(await lockRow(manager, 'contracts', id))) throw new AppException('RESOURCE_NOT_FOUND');
    const contract = await manager.getRepository(Contract).findOneByOrFail({ id });
    if (contract.endedOn) throw new AppException('CONTRACT_ALREADY_ENDED');
    return contract;
  }

  // Hợp đồng đã kết thúc tính đến ngày kết thúc thực tế; hủy trước khi vào ở không chiếm khoảng nào
  private async assertNoOverlap(
    manager: EntityManager,
    roomId: string,
    startDate: string,
    endDate: string,
    exceptId: string | null = null,
  ) {
    const overlap = await selectOne(
      manager,
      `select 1 from public.contracts c
        where c.room_id = $1 and c.id is distinct from $4::uuid
          and not (c.ended_on is not null and c.ended_on < c.start_date)
          and daterange(c.start_date, coalesce(c.ended_on, c.end_date), '[]')
              && daterange($2::date, $3::date, '[]')
        limit 1`,
      [roomId, startDate, endDate, exceptId],
    );
    if (overlap) throw new AppException('CONTRACT_PERIOD_OVERLAP');
  }

  // Chỉ số bàn giao bắt buộc với mỗi loại công tơ đang dùng
  private async assertInitialReadings(manager: EntityManager, readings: MeterReadingInputDto[] = []) {
    const meters = await selectRows<{ meter_type: MeterType }>(
      manager,
      `select distinct meter_type from public.charge_types where calculation_method = 'METER' and is_active`,
    );
    const details: ErrorDetail[] = meters
      .filter((m) => !readings.some((r) => r.meterType === m.meter_type))
      .map((m) => ({
        field: 'initialReadings',
        code: DetailCode.REQUIRED,
        message: `Thiếu chỉ số bàn giao ${METER_LABELS[m.meter_type]}`,
        meterType: m.meter_type,
      }));
    if (details.length > 0) throw new AppException('VALIDATION_ERROR', details);
  }

  // Dịch vụ đăng ký: khoản thu không bắt buộc, đang dùng
  private async assertServices(manager: EntityManager, services: ContractServiceInputDto[], field: string) {
    if (services.length === 0) return;
    const rows = await selectRows<{ id: string; ok: boolean }>(
      manager,
      `select id, (is_active and not is_mandatory
                   and calculation_method not in ('CONTRACT_RENT', 'MANUAL')) as ok
         from public.charge_types where id = any($1::uuid[])`,
      [services.map((s) => s.chargeTypeId)],
    );
    const details: ErrorDetail[] = services.flatMap((s, i) =>
      rows.find((r) => r.id === s.chargeTypeId)?.ok
        ? []
        : [
            {
              field: `${field}[${i}].chargeTypeId`,
              code: DetailCode.INVALID_FORMAT,
              message: 'Khoản thu không tồn tại, đã ngừng dùng hoặc là khoản bắt buộc',
            },
          ],
    );
    if (details.length > 0) throw new AppException('VALIDATION_ERROR', details);
  }

  private assertDistinctIdNumbers(dto: CreateContractDto) {
    const seen = new Set([dto.primaryTenant.idNumber]);
    const details: ErrorDetail[] = [];
    (dto.additionalOccupants ?? []).forEach((person, i) => {
      if (seen.has(person.idNumber)) {
        details.push({
          field: `additionalOccupants[${i}].idNumber`,
          code: DetailCode.DUPLICATE_ITEM,
          message: 'Số CCCD bị trùng với người khác trong hợp đồng',
        });
      }
      seen.add(person.idNumber);
    });
    if (details.length > 0) throw new AppException('VALIDATION_ERROR', details);
  }

  private async insertServices(
    manager: EntityManager,
    contractId: string,
    services: ContractServiceInputDto[],
    fromPeriod: string,
  ) {
    if (services.length === 0) return;
    await manager.getRepository(ContractService).insert(
      services.map((s) => ({
        contractId,
        chargeTypeId: s.chargeTypeId,
        quantity: s.quantity,
        fromPeriod,
        toPeriod: null,
      })),
    );
  }

  private async toResponses(
    manager: EntityManager,
    rows: ContractRow[],
    visibility: OccupantVisibility,
    includeOccupants: boolean,
  ) {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [services, renewals, occupants] = await Promise.all([
      selectRows<ServiceRow>(
        manager,
        `select cs.contract_id, cs.charge_type_id, ct.name as charge_type_name, cs.quantity,
                cs.from_period, cs.to_period
           from public.contract_services cs
           join public.charge_types ct on ct.id = cs.charge_type_id
          where cs.contract_id = any($1::uuid[])
          order by cs.from_period, ct.name`,
        [ids],
      ),
      selectRows<RenewalRow>(
        manager,
        `select contract_id, addendum_number, signed_on, previous_end_date, new_end_date,
                monthly_rent, effective_from
           from public.contract_renewals
          where contract_id = any($1::uuid[])
          order by effective_from`,
        [ids],
      ),
      includeOccupants ? findOccupantsOfContracts(manager, ids, true) : Promise.resolve([]),
    ]);

    return rows.map((r) => ({
      id: r.id,
      roomId: r.room_id,
      roomCode: r.room_code,
      contractNumber: r.contract_number,
      signedOn: r.signed_on,
      primaryTenant: { occupantId: r.primary_occupant_id, fullName: r.primary_name },
      startDate: r.start_date,
      endDate: r.end_date,
      monthlyRent: r.monthly_rent,
      currentMonthlyRent: r.current_monthly_rent,
      deposit: r.deposit,
      initialReadings: readingsOf(r.initial_electricity_reading, r.initial_water_reading),
      status: r.status,
      note: r.note,
      endedOn: r.ended_on,
      cancelledBeforeStart: r.ended_on !== null && r.ended_on < r.start_date,
      endNote: r.end_note,
      finalReadings: readingsOf(r.final_electricity_reading, r.final_water_reading),
      settlementInvoiceId: r.settlement_invoice_id,
      depositApplied: r.deposit_applied,
      depositRefundAmount: r.deposit_refund_amount,
      services: services
        .filter((s) => s.contract_id === r.id)
        .map((s) => ({
          chargeTypeId: s.charge_type_id,
          chargeTypeName: s.charge_type_name,
          quantity: s.quantity,
          fromPeriod: s.from_period,
          toPeriod: s.to_period,
        })),
      ...(includeOccupants && {
        occupants: occupants
          .filter((o) => o.contract_id === r.id)
          .map((o) => toOccupantSummary(o, visibility)),
      }),
      tenantUserId: r.tenant_user_id,
      renewals: renewals
        .filter((x) => x.contract_id === r.id)
        .map((x) => ({
          addendumNumber: x.addendum_number,
          signedOn: x.signed_on,
          previousEndDate: x.previous_end_date,
          newEndDate: x.new_end_date,
          monthlyRent: x.monthly_rent,
          effectiveFrom: x.effective_from,
        })),
      createdAt: toVnDateTime(r.created_at),
    }));
  }
}

function readingsOf(electricity: number | null, water: number | null) {
  return [
    ...(electricity !== null ? [{ meterType: MeterType.ELECTRICITY, reading: electricity }] : []),
    ...(water !== null ? [{ meterType: MeterType.WATER, reading: water }] : []),
  ];
}

// Khi sửa, loại công tơ không gửi thì giữ chỉ số cũ
function readingColumns(readings: MeterReadingInputDto[] = [], current?: Contract) {
  const find = (type: MeterType) => readings.find((r) => r.meterType === type)?.reading;
  const electricity = find(MeterType.ELECTRICITY);
  const water = find(MeterType.WATER);
  if (current) {
    return {
      ...(electricity !== undefined && { initialElectricityReading: electricity }),
      ...(water !== undefined && { initialWaterReading: water }),
    };
  }
  return {
    initialElectricityReading: electricity ?? null,
    initialWaterReading: water ?? null,
  };
}
